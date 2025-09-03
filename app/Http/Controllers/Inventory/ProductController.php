<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreProductRequest;
use App\Http\Requests\Inventory\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage; // Importar
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()
            ->with(['category:id,name', 'supplier:id,name', 'variants']);

        if ($s = $request->string('search')->toString()) {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhereHas('variants', fn($v) => $v->where('sku', 'like', "%{$s}%"));
            });
        }

        if ($cat = $request->integer('category_id')) {
            $query->where('category_id', $cat);
        }

        if ($sup = $request->integer('supplier_id')) {
            $query->where('supplier_id', $sup);
        }

        $products = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('inventory/products/index', [
            'products' => $products,
            'categories' => Category::all(['id', 'name']),
            'suppliers' => Supplier::all(['id', 'name']),
            // Para mantener filtros seleccionados en el frontend si quieres:
            'filters' => $request->only('search', 'category_id', 'supplier_id'),
        ]);
    }


    public function create()
    {
        return Inertia::render('inventory/products/create', [
            'categories' => Category::all(['id', 'name']),
            'suppliers' => Supplier::all(['id', 'name'])
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $validatedData = $request->validated();

        $product = DB::transaction(function () use ($validatedData, $request) {
            // 1. Crear el producto "padre"
            $product = Product::create($validatedData);

            // 2. Manejar la subida de la imagen
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('images/products', 'public');
            }

            // 3. Recorrer y crear cada variante
            foreach ($validatedData['variants'] as $index => $variantData) {

                // 4. Parsear la cadena de atributos a un objeto JSON
                $attributesObject = $this->parseAttributes($variantData['attributes'] ?? null);

                // 5. Crear la variante en la base de datos
                $product->variants()->create([
                    'sku'           => $variantData['sku'],
                    'selling_price' => $variantData['selling_price'],
                    'cost_price'    => $variantData['cost_price'],
                    'attributes'    => $attributesObject,
                    // Asigna la imagen solo a la primera variante
                    'image_path'    => $index === 0 ? $imagePath : null,
                ]);
            }

            // (Lógica de inventario inicial se haría aquí si es necesario)

            return $product;
        });

        return to_route('inventory.products.index')->with('success', 'Producto "' . $product->name . '" creado exitosamente.');
    }

    public function show(Request $request, Product $product)
    {
        $storeId = $request->integer('store_id') ?: null;

        $product->load([
            'category:id,name',
            'supplier:id,name',
            'variants:id,product_id,sku,barcode,attributes,cost_price,selling_price,image_path',
            'variants.inventory.store:id,name',
        ]);

        // IDs de las variantes del producto
        $variantIds = $product->variants->pluck('id');

        // Opciones de Tienda (solo tiendas que tienen alguna existencia o movimiento del producto)
        $stores = Store::select('stores.id', 'stores.name')
            ->where(function ($q) use ($variantIds) {
                $q->whereExists(function ($sub) use ($variantIds) {
                    $sub->select(DB::raw(1))
                        ->from('inventory')
                        ->whereColumn('inventory.store_id', 'stores.id')
                        ->whereIn('inventory.product_variant_id', $variantIds);
                })->orWhereExists(function ($sub) use ($variantIds) {
                    $sub->select(DB::raw(1))
                        ->from('product_stock_movements')
                        ->whereColumn('product_stock_movements.store_id', 'stores.id')
                        ->whereIn('product_stock_movements.product_variant_id', $variantIds);
                });
            })
            ->orderBy('stores.name')
            ->get();

        // --- Stock (global o por tienda) ---
        if ($storeId) {
            // Totales por TIENDA seleccionada
            $rows = DB::table('inventory')
                ->select('store_id', DB::raw('SUM(quantity) as qty'))
                ->where('store_id', $storeId)
                ->whereIn('product_variant_id', $variantIds)
                ->groupBy('store_id')
                ->get();

            $perStore = $rows->map(function ($r) {
                return [
                    'store' => ['id' => (int) $r->store_id, 'name' => Store::find($r->store_id)?->name ?? 'Tienda'],
                    'qty'   => (int) $r->qty,
                ];
            })->values();

            $totalStock = (int) ($rows->first()->qty ?? 0);
        } else {
            // Totales en TODAS las tiendas
            $rows = DB::table('inventory')
                ->join('stores', 'stores.id', '=', 'inventory.store_id')
                ->select('inventory.store_id', 'stores.name', DB::raw('SUM(inventory.quantity) as qty'))
                ->whereIn('inventory.product_variant_id', $variantIds)
                ->groupBy('inventory.store_id', 'stores.name')
                ->orderBy('stores.name')
                ->get();

            $perStore = $rows->map(fn($r) => [
                'store' => ['id' => (int) $r->store_id, 'name' => $r->name],
                'qty'   => (int) $r->qty,
            ])->values();

            $totalStock = (int) $rows->sum('qty');
        }

        $stock = [
            'total'     => $totalStock,
            'per_store' => $perStore,
        ];

        // --- Existencia por variante (solo si hay tienda seleccionada) ---
        $variantStock = [];
        if ($storeId) {
            $vs = DB::table('inventory')
                ->select('product_variant_id', DB::raw('SUM(quantity) as qty'))
                ->where('store_id', $storeId)
                ->whereIn('product_variant_id', $variantIds)
                ->groupBy('product_variant_id')
                ->get();

            foreach ($vs as $r) {
                $variantStock[(int) $r->product_variant_id] = (int) $r->qty;
            }
        }

        // --- Movimientos (filtrados opcionalmente por tienda) ---
        $movements = ProductStockMovement::query()
            ->with([
                'store:id,name',
                'variant:id,sku,product_id',
                'user:id,name',
            ])
            ->whereIn('product_variant_id', $variantIds)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn($m) => [
                'id'          => $m->id,
                'date'        => $m->created_at?->toIso8601String(),
                'type'        => $m->type,          // purchase_entry | sale_exit | adjustment_in | adjustment_out
                'type_label'  => $m->type_label,    // Texto legible
                'quantity'    => $m->signed_quantity, // con signo
                'unit_price'  => $m->unit_price,
                'subtotal'    => $m->subtotal,
                'notes'       => $m->notes,
                'store'       => $m->store ? ['id' => $m->store->id, 'name' => $m->store->name] : null,
                'variant'     => $m->variant ? ['id' => $m->variant->id, 'sku' => $m->variant->sku] : null,
                'user'        => $m->user ? ['id' => $m->user->id, 'name' => $m->user->name] : null,
            ]);

        return Inertia::render('inventory/products/show', [
            'product'            => $product,
            'stock'              => $stock,
            'movements'          => $movements,
            'stores'             => $stores,
            'selected_store_id'  => $storeId,
            'variant_stock'      => $variantStock, // { [variantId]: qty } solo si hay tienda
        ]);
    }


    public function edit(Product $product)
    {
        return Inertia::render('inventory/products/edit', [
            'product' => $product->load('variants'), // Carga el producto y sus variantes
            'categories' => Category::all(['id', 'name']),
        ]);
    }



    public function update(UpdateProductRequest $request, Product $product)
    {
        $validatedData = $request->validated();

        DB::transaction(function () use ($validatedData, $request, $product) {
            // 1. Actualizar datos del producto principal
            $product->update($validatedData);

            $incomingVariants = collect($validatedData['variants']);
            $existingVariantIds = $product->variants->pluck('id');
            $incomingVariantIds = $incomingVariants->pluck('id')->filter();

            // 2. Eliminar variantes que ya no están en el formulario
            $variantsToDelete = $existingVariantIds->diff($incomingVariantIds);
            if ($variantsToDelete->isNotEmpty()) {
                ProductVariant::destroy($variantsToDelete);
            }

            // 3. Actualizar o Crear variantes (SIN TOCAR LA IMAGEN)
            foreach ($incomingVariants as $variantData) {
                $attributesObject = $this->parseAttributes($variantData['attributes'] ?? null);


                // Esta parte ahora NO incluye 'image_path', preservando el valor existente
                if (!empty($variantData['id'])) {
                    $product->variants()->whereKey($variantData['id'])->update([
                        'sku'           => $variantData['sku'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price'    => $variantData['cost_price'],
                        'attributes'    => $attributesObject,
                    ]);
                } else {
                    $product->variants()->create([
                        'sku'           => $variantData['sku'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price'    => $variantData['cost_price'],
                        'attributes'    => $attributesObject,
                    ]);
                }
            }

            // 4. LÓGICA DE LA IMAGEN (SEPARADA Y CONDICIONAL)
            // Esta sección se ejecuta solo si se sube un nuevo archivo.
            if ($request->hasFile('image')) {
                // Recargamos la relación por si se crearon nuevas variantes
                $product->load('variants');
                $variantToUpdate = $product->variants()->first();

                // Si la variante principal ya tenía una imagen, la borramos
                if ($variantToUpdate && $variantToUpdate->image_path) {
                    Storage::disk('public')->delete($variantToUpdate->image_path);
                }

                // Guardamos la nueva imagen y actualizamos solo ese campo
                $imagePath = $request->file('image')->store('images/products', 'public');
                if ($variantToUpdate) {
                    $variantToUpdate->update(['image_path' => $imagePath]);
                }
            }
        });

        return to_route('inventory.products.index')->with('success', 'Producto actualizado.');
    }

    public function destroy(Product $product)
    {
        // Opcional: Añadir validaciones (ej. no borrar si tiene ventas)

        DB::transaction(function () use ($product) {
            foreach ($product->variants as $variant) {
                // Borrar la imagen del almacenamiento
                if ($variant->image_path) {
                    Storage::disk('public')->delete($variant->image_path);
                }
            }
            // Al borrar el producto, las variantes se borran en cascada por la BD
            $product->delete();
        });

        return to_route('inventory.products.index')->with('success', 'Producto eliminado.');
    }


    private function parseAttributes(mixed $raw): ?array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (is_string($raw) && trim($raw) !== '') {
            return collect(explode(',', $raw))
                ->mapWithKeys(function ($pair) {
                    [$k, $v] = array_pad(array_map('trim', explode(':', $pair, 2)), 2, null);
                    return $k && $v ? [$k => $v] : [];
                })
                ->toArray();
        }
        return null;
    }
}
