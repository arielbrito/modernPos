<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreProductRequest;
use App\Http\Requests\Inventory\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\ProductStockMovement;
use App\Models\ProductVariant;
use App\Models\PurchaseItem;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage; // Importar
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Arr;
use App\Services\ProductService;

class ProductController extends Controller
{
    public function __construct(protected ProductService $productService) {}


    public function index(Request $request)
    {
        $currentStoreId = (int) session('active_store_id');
        $currentStoreId = $currentStoreId ? (int) $currentStoreId : null;

        $storeId = $request->filled('store_id')
            ? (int) $request->input('store_id')
            : $currentStoreId;

        $s            = trim((string) $request->input('search', ''));
        $categoryId   = $request->input('category_id');
        $supplierId   = $request->input('supplier_id');
        $minPrice     = $request->filled('min_price') ? (float) $request->input('min_price') : null;
        $maxPrice     = $request->filled('max_price') ? (float) $request->input('max_price') : null;
        $onlyLowStock = filter_var($request->input('only_low_stock', false), FILTER_VALIDATE_BOOLEAN);
        $onlyActive   = filter_var($request->input('only_active', true), FILTER_VALIDATE_BOOLEAN);
        // $storeId      = $request->input('store_id'); // opcional
        $threshold    = (int) $request->input('low_stock_threshold', 10);

        $lowStockThreshold = 10;

        $lowStockCount = Product::query()
            ->where('product_nature', 'stockable')
            ->where('is_active', true)
            ->where(function ($query) use ($storeId, $lowStockThreshold) {
                $query->selectRaw('COALESCE(SUM(i.quantity), 0)')
                    ->from('inventory as i')
                    ->join('product_variants as pv', 'pv.id', '=', 'i.product_variant_id')
                    ->whereColumn('pv.product_id', 'products.id')
                    ->when($storeId, fn($q) => $q->where('i.store_id', $storeId));
            }, '<', $lowStockThreshold)
            ->count();

        $sortField    = in_array($request->input('sort_field'), ['name', 'price', 'created_at', 'updated_at'], true)
            ? $request->input('sort_field') : 'name';
        $sortDir      = $request->input('sort_direction') === 'desc' ? 'desc' : 'asc';

        $query = Product::query()
            ->when($request->boolean('only_active', true), fn($q) => $q->active())
            ->with([
                'category:id,name',
                'supplier:id,name',
                // Variantes con stock por variante
                'variants' => function ($q) use ($storeId) {
                    $q->where('is_active', true)
                        ->withSum([
                            'inventory as stock' => function ($iq) use ($storeId) {
                                if ($storeId) {
                                    $iq->where('store_id', $storeId);
                                }
                            }
                        ], 'quantity')
                        ->select(['id', 'product_id', 'sku', 'selling_price', 'image_path', 'attributes', 'is_active']);
                },
            ])
            // === Total por producto (NO colisiona con variant.stock) ===
            ->select('products.*')
            ->selectSub(function ($sub) use ($storeId) {
                $sub->from('product_variants as pv')
                    ->leftJoin('inventory as i', 'i.product_variant_id', '=', 'pv.id')
                    ->whereColumn('pv.product_id', 'products.id')
                    ->when($storeId, fn($qq) => $qq->where('i.store_id', $storeId))
                    ->selectRaw('COALESCE(SUM(i.quantity),0)');
            }, 'total_stock');

        if ($s !== '') {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhereHas('variants', fn($v) => $v->where('sku', 'like', "%{$s}%"));
            });
        }

        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', $categoryId);
        }
        if ($supplierId && $supplierId !== 'all') {
            $query->where('supplier_id', $supplierId);
        }

        if ($minPrice !== null || $maxPrice !== null) {
            $query->whereHas('variants', function ($v) use ($minPrice, $maxPrice) {
                if ($minPrice !== null) $v->where('selling_price', '>=', $minPrice);
                if ($maxPrice !== null) $v->where('selling_price', '<=', $maxPrice);
            });
        }

        if ($onlyLowStock) {
            $query->whereHas('variants', function ($v) use ($threshold, $storeId) {
                $sql = 'COALESCE((SELECT SUM(i.quantity) FROM inventory i WHERE i.product_variant_id = product_variants.id'
                    . ($storeId ? ' AND i.store_id = ?' : '')
                    . '), 0) < ?';
                $bindings = $storeId ? [$storeId, $threshold] : [$threshold];
                $v->whereRaw($sql, $bindings);
            });
        }

        if ($sortField === 'price') {
            $query->withMin('variants as min_price', 'selling_price')
                ->orderBy('min_price', $sortDir);
        } else {
            $query->orderBy($sortField, $sortDir);
        }


        $baseAgg = DB::table('inventory as i')
            ->join('product_variants as pv', 'pv.id', '=', 'i.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->when($storeId, fn($q) => $q->where('i.store_id', $storeId));
        // Si quieres contar solo activos:
        $baseAggActivos = (clone $baseAgg)->where('p.is_active', true)->where('pv.is_active', true);

        // 👉 Total de **productos** (artículos) en la tienda actual
        $productsCountStore = (clone $baseAgg)->distinct()->count('p.id');

        // 👉 (Opcional) Total de **productos activos** en la tienda actual
        $activeProductsCountStore = (clone $baseAggActivos)->distinct()->count('p.id');

        // 👉 (Opcional) Total de **variantes (SKUs)** en la tienda actual
        $variantsCountStore = (clone $baseAgg)->distinct()->count('pv.id');

        $products = $query->paginate(10)->withQueryString();

        $catalogProductsCount        = Product::count();
        $catalogActiveProductsCount  = Product::where('is_active', true)->count();
        $catalogVariantsCount        = ProductVariant::count();
        $catalogActiveVariantsCount  = ProductVariant::where('is_active', true)->count();

        return Inertia::render('inventory/products/index', [
            'products'   => $products,
            'categories' => Category::all(['id', 'name']),
            'suppliers'  => Supplier::all(['id', 'name']),
            'storeStats' => [
                'current' => [
                    'store_id'         => $storeId,
                    // 👉 catálogos (no dependen de inventory)
                    'catalog_products'        => $catalogProductsCount,
                    'catalog_active_products' => $catalogActiveProductsCount,
                    'catalog_variants'        => $catalogVariantsCount,
                    'catalog_active_variants' => $catalogActiveVariantsCount,
                    // 👉 métricas por tienda basadas en inventory (pueden ser 1 si sólo hay 1 fila en esa tienda)
                    'products'         => $productsCountStore,
                    'active_products'  => $activeProductsCountStore,
                    'variants'         => $variantsCountStore,
                    'low_stock_count' => $lowStockCount,
                ],
            ],
            'filters'    => $request->only([
                'search',
                'category_id',
                'supplier_id',
                'min_price',
                'max_price',
                'sort_field',
                'sort_direction',
                'only_low_stock',
                'only_active',
                'store_id',
                'low_stock_threshold'
            ]),
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
        $product = $this->productService->createProduct($request);

        return to_route('inventory.products.index')
            ->with('success', 'Producto "' . $product->name . '" creado exitosamente.');
    }

    public function show(Product $product)
    {
        $product->load([
            'category:id,name',
            'supplier:id,name',
            'variants.inventory.store:id,name',
        ]);

        // Sumar stock y umbrales por tienda (todas las variantes del producto)
        $perStore = collect();
        $totalStock = 0;

        foreach ($product->variants as $variant) {
            foreach ($variant->inventory as $inv) {
                if (!$perStore->has($inv->store_id)) {
                    $perStore[$inv->store_id] = [
                        'store'      => ['id' => $inv->store->id, 'name' => $inv->store->name],
                        'qty'        => 0,
                        'threshold'  => 0,
                        'low'        => false, // se calculará abajo
                    ];
                }
                $entry = $perStore[$inv->store_id];

                $entry['qty']       += (int) $inv->quantity;
                $entry['threshold'] += (int) $inv->stock_alert_threshold;

                // Marca "low" si alguna variante en esa tienda está por debajo de su propio umbral
                if ((int)$inv->quantity <= (int)$inv->stock_alert_threshold) {
                    $entry['low'] = true;
                }

                $perStore[$inv->store_id] = $entry;
                $totalStock += (int) $inv->quantity;
            }
        }

        // Si el total por tienda también está por debajo del umbral agregado, marcamos low
        $perStore = $perStore->map(function ($entry) {
            if ($entry['qty'] <= $entry['threshold']) {
                $entry['low'] = true;
            }
            return $entry;
        });

        $stock = [
            'total'     => $totalStock,
            'per_store' => array_values($perStore->all()),
        ];

        // Movimientos recientes
        $movements = [];
        if (class_exists(ProductStockMovement::class)) {
            $variantIds = $product->variants->pluck('id');

            $movements = ProductStockMovement::query()
                ->with([
                    'store:id,name',
                    'variant:id,sku,product_id',
                    'user:id,name',
                ])
                ->whereIn('product_variant_id', $variantIds)
                ->latest()
                ->limit(100)
                ->get()
                ->map(fn($m) => [
                    'id'         => $m->id,
                    'date'       => $m->created_at?->toIso8601String(),
                    'type'       => $m->type,
                    'quantity'   => $m->quantity,
                    'unit_price' => $m->unit_price,
                    'subtotal'   => $m->subtotal,
                    'store'      => $m->store ? ['id' => $m->store->id, 'name' => $m->store->name] : null,
                    'variant'    => $m->variant ? ['id' => $m->variant->id, 'sku' => $m->variant->sku] : null,
                    'user'       => $m->user ? ['id' => $m->user->id, 'name' => $m->user->name] : null,
                    'notes'      => $m->notes,
                ]);
        }

        // Tiendas (para filtros y ajuste rápido)
        $stores = Store::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('inventory/products/show', [
            'product'   => $product,  // incluye variants con image_url
            'stock'     => $stock,
            'movements' => $movements,
            'stores'    => $stores,
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
        $this->productService->updateProduct($request, $product);

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



    public function stockTimeseries(Request $request, Product $product)
    {
        // Filtros
        $storeId   = $request->integer('store_id') ?: null;
        $variantId = $request->integer('variant_id') ?: null;

        // Rango de fechas (por defecto últimos 30 días)
        $to   = $request->date('to')   ? CarbonImmutable::parse($request->date('to'))->endOfDay()   : now()->endOfDay();
        $from = $request->date('from') ? CarbonImmutable::parse($request->date('from'))->startOfDay() : $to->subDays(29)->startOfDay();

        // Variantes a incluir
        $variantIds = $variantId
            ? collect([(int) $variantId])
            : $product->variants()->pluck('id');

        // Helper para signo de movimientos
        $signedExpr = "CASE WHEN type IN ('purchase_entry','adjustment_in') THEN quantity ELSE -quantity END";

        // --- 1) Flujos diarios dentro del rango ---
        $flows = ProductStockMovement::query()
            ->selectRaw("DATE(created_at) as d")
            ->selectRaw("SUM(CASE WHEN type IN ('purchase_entry','adjustment_in') THEN quantity ELSE 0 END) as in_qty")
            ->selectRaw("SUM(CASE WHEN type IN ('sale_exit','adjustment_out') THEN quantity ELSE 0 END) as out_qty")
            ->selectRaw("SUM($signedExpr) as net_qty")
            ->whereIn('product_variant_id', $variantIds)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereBetween('created_at', [$from, $to])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('d')
            ->get()
            ->keyBy(fn($r) => CarbonImmutable::parse($r->d)->toDateString());

        // --- 2) Stock actual (inventario al día de hoy) ---
        $currentStock = Inventory::query()
            ->whereIn('product_variant_id', $variantIds)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->sum('quantity');

        // --- 3) Delta desde "from" hasta ahora (para calcular baseline en "from") ---
        $netFromToNow = ProductStockMovement::query()
            ->whereIn('product_variant_id', $variantIds)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('created_at', '>=', $from)
            ->sum(DB::raw($signedExpr));

        // Stock al inicio del rango = stock actual - movimientos desde 'from' hasta ahora
        $baseline = (int) $currentStock - (float) $netFromToNow;

        // --- 4) Construir serie diaria completa (rellenando días sin movimientos) ---
        $series = [];
        $cursor = $from;
        $running = (float) $baseline;

        while ($cursor->lte($to)) {
            $key = $cursor->toDateString();

            // --- CORRECCIÓN ---
            // Obtenemos el registro del día de forma segura. Si no existe, será null.
            $day_flow = $flows->get($key);

            // Usamos el operador de fusión de null (??) para asignar 0 si el registro o la propiedad no existen.
            // Esto evita el error "Trying to get property of non-object".
            $in  = (float) ($day_flow->in_qty ?? 0);
            $out = (float) ($day_flow->out_qty ?? 0);
            $net = (float) ($day_flow->net_qty ?? 0);
            $running += $net;

            $series[] = [
                'date'    => $key,
                'in'      => round($in, 2),
                'out'     => round($out, 2),
                'net'     => round($net, 2),
                'stock'   => round($running, 2), // nivel de existencias
            ];

            $cursor = $cursor->addDay();
        }

        // Variantes (para combo en el front)
        $variants = $product->variants()
            ->select('id', 'sku')
            // Se quitó whereIn para mostrar siempre todas las variantes del producto en el selector
            ->orderBy('sku')
            ->get();

        return response()->json([
            'meta' => [
                'product_id' => $product->id,
                'store_id'   => $storeId,
                'variant_id' => $variantId,
                'from'       => $from->toDateString(),
                'to'         => $to->toDateString(),
                'baseline'   => (float) $baseline,
                'current'    => (float) $currentStock,
            ],
            'variants' => $variants,
            'series'   => $series, // [{ date, in, out, net, stock }]
        ]);
    }


    public function exportMovements(Product $product): StreamedResponse
    {
        $variantIds = $product->variants()->pluck('id');

        $rows = ProductStockMovement::with(['store:id,name', 'variant:id,sku', 'user:id,name'])
            ->whereIn('product_variant_id', $variantIds)
            ->orderByDesc('created_at')
            ->get();

        $filename = 'product_' . $product->id . '_movements_' . now()->format('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return response()->stream(function () use ($rows) {
            $out = fopen('php://output', 'w');
            // BOM para Excel
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($out, ['Fecha', 'Tipo', 'Tienda', 'SKU', 'Cantidad', 'P.Unit', 'Subtotal', 'Usuario', 'Notas']);
            foreach ($rows as $m) {
                fputcsv($out, [
                    optional($m->created_at)->toDateTimeString(),
                    $m->type,
                    optional($m->store)->name,
                    optional($m->variant)->sku,
                    $m->quantity,
                    $m->unit_price,
                    $m->subtotal,
                    optional($m->user)->name,
                    $m->notes,
                ]);
            }
            fclose($out);
        }, 200, $headers);
    }



    public function search(Request $request)
    {
        $term = $request->query('term', '');
        $storeId = session('active_store_id');

        if (strlen($term) < 2 || !$storeId) {
            return response()->json([]);
        }

        $products = Product::query()
            ->where('is_active', true)
            ->where(function ($query) use ($term) {
                $query->where('name', 'ILIKE', "%{$term}%")
                    ->orWhereHas('variants', function ($q) use ($term) {
                        $q->where('sku', 'ILIKE', "%{$term}%");
                    });
            })
            // Eager load variants y, para cada variante, suma la cantidad
            // de la tabla 'inventory' que coincida con la tienda activa.
            ->with(['variants' => function ($query) use ($storeId) {
                $query->withSum([
                    'inventory as stock_quantity' => fn($q) => $q->where('store_id', $storeId)
                ], 'quantity');
            }])
            ->take(15)
            ->get();

        // El frontend espera que la respuesta sea directamente un array de productos
        // que contienen sus variantes, justo como lo devuelve esta consulta.
        return response()->json($products);
    }
}
