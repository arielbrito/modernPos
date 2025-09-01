<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreProductRequest;
use App\Http\Requests\Inventory\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage; // Importar
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        // Lógica para obtener productos paginados
        $products = Product::with('category', 'variants')->paginate(10);

        return Inertia::render('inventory/products/index', [
            'products' => $products,
            'categories' => Category::all(['id', 'name']),
            'suppliers' => Supplier::all(['id', 'name'])
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
                $attributesObject = null;
                if (!empty($variantData['attributes'])) {
                    $attributesObject = collect(explode(',', $variantData['attributes']))
                        ->mapWithKeys(function ($pair) {
                            $parts = explode(':', trim($pair));
                            return count($parts) === 2 ? [trim($parts[0]) => trim($parts[1])] : [];
                        })->toArray();
                }

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
                $attributesObject = null; // Lógica para parsear atributos...
                if (!empty($variantData['attributes'])) {
                    $attributesObject = collect(explode(',', $variantData['attributes']))
                        ->mapWithKeys(function ($pair) {
                            $parts = explode(':', trim($pair));
                            return count($parts) === 2 ? [trim($parts[0]) => trim($parts[1])] : [];
                        })->toArray();
                }

                // Esta parte ahora NO incluye 'image_path', preservando el valor existente
                $product->variants()->updateOrCreate(
                    ['id' => $variantData['id'] ?? null],
                    [
                        'sku'           => $variantData['sku'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price'    => $variantData['cost_price'],
                        'attributes'    => $attributesObject,
                    ]
                );
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
}
