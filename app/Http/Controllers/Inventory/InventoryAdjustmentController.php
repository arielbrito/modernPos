<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreInventoryAdjustmentRequest;
use App\Http\Requests\Inventory\StoreBulkInventoryAdjustmentRequest;
use App\Models\Category;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Services\InventoryAdjustmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\InventoryAdjustment; // <-- Añadir import
use Illuminate\Support\Carbon; // <-- Añadir import
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InventoryAdjustmentController extends Controller
{
    public function __construct(private InventoryAdjustmentService $adjustmentService) {}

    public function index(Request $request)
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
        ]);

        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = $request->to ? Carbon::parse($request->to)->endOfDay() : now()->endOfDay();

        // --- CORRECCIÓN EN LA CONSULTA DE KPIs ---
        // Ahora consultamos la tabla de movimientos directamente.
        $stats = DB::table('product_stock_movements')
            ->whereIn('type', ['adjustment_in', 'adjustment_out']) // Solo movimientos de tipo ajuste
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("
                SUM(CASE WHEN type = 'adjustment_in' THEN quantity ELSE 0 END) as total_units_in,
                SUM(CASE WHEN type = 'adjustment_out' THEN ABS(quantity) ELSE 0 END) as total_units_out,
                SUM(CASE WHEN type = 'adjustment_in' THEN subtotal ELSE 0 END) as total_value_in,
                SUM(CASE WHEN type = 'adjustment_out' THEN subtotal ELSE 0 END) as total_value_out
            ")->first();

        // --- Listado Paginado (sin cambios) ---
        $adjustments = InventoryAdjustment::with(['user:id,name', 'store:id,name'])
            ->withCount('items')
            ->whereBetween('adjustment_date', [$from, $to])
            ->latest('adjustment_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('inventory/adjustments/index', [
            'adjustments' => $adjustments,
            'stats' => [
                'total_units_in'   => (float) $stats->total_units_in,
                'total_units_out'  => (float) $stats->total_units_out,
                'total_value_in'   => (float) $stats->total_value_in,
                'total_value_out'  => (float) $stats->total_value_out,
                'net_value_change' => (float) $stats->total_value_in - (float) $stats->total_value_out,
                'count'            => $adjustments->total(),
            ],
            'filters' => [
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(),
            ]
        ]);
    }

    public function create()
    {
        // Esta vista necesitará un buscador de productos asíncrono, similar al de compras.
        return Inertia::render('inventory/adjustments/create');
    }

    public function bulkCreate(Request $request)
    {
        $storeId = session('active_store_id');
        if (!$storeId) {
            return back()->with('error', 'No hay una tienda activa seleccionada.');
        }

        $filters = $request->only(['term', 'category_id', 'supplier_id']);

        $variants = ProductVariant::query()
            ->with(['product.category', 'product.supplier'])
            // Suma la cantidad de la tabla 'inventory' que coincida con la tienda activa.
            // El resultado estará en un nuevo atributo llamado 'stock_quantity'.
            ->withSum(['inventory as stock_quantity' => function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            }], 'quantity')
            // Filtrar por término de búsqueda (nombre de producto o SKU de variante)
            ->when($filters['term'] ?? null, function ($query, $term) {
                $query->where('sku', 'ilike', "%{$term}%")
                    ->orWhereHas('product', function ($q) use ($term) {
                        $q->where('name', 'ilike', "%{$term}%");
                    });
            })
            // Filtrar por categoría
            ->when($filters['category_id'] ?? null, function ($query, $categoryId) {
                $query->whereHas('product', fn($q) => $q->where('category_id', $categoryId));
            })
            // Filtrar por suplidor
            ->when($filters['supplier_id'] ?? null, function ($query, $supplierId) {
                $query->whereHas('product', fn($q) => $q->where('supplier_id', $supplierId));
            })
            ->orderBy('id', 'desc')
            ->paginate(50) // Paginamos para manejar grandes cantidades de productos
            ->withQueryString();

        return Inertia::render('inventory/adjustments/bulkCreate', [
            'variants' => $variants,
            'filters' => $filters,
            'filterOptions' => [
                'categories' => Category::all(['id', 'name']),
                'suppliers' => Supplier::where('is_active', true)->get(['id', 'name']),
            ]
        ]);
    }

    public function store(StoreInventoryAdjustmentRequest $request)
    {
        $storeId = session('active_store_id');
        if (!$storeId) {
            return back()->with('error', 'No hay una tienda activa seleccionada.');
        }

        try {
            $this->adjustmentService->create(
                $request->validated(),
                $storeId,
                Auth::id()
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('inventory.adjustments.index') // Asumiendo que tendrás un listado
            ->with('success', 'Ajuste de inventario guardado exitosamente.');
    }

    public function bulkStore(StoreBulkInventoryAdjustmentRequest $request)
    {
        $storeId = session('active_store_id');
        if (!$storeId) {
            return back()->with('error', 'No hay una tienda activa seleccionada.');
        }

        try {
            // ¡La magia de los servicios! Reutilizamos la misma lógica.
            $this->adjustmentService->create(
                $request->validated(),
                $storeId,
                Auth::id()
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        // Redirigimos a la misma página para que el usuario vea el stock actualizado
        return redirect()->route('inventory.adjustments.index')
            ->with('success', 'Ajuste de inventario guardado exitosamente.');
    }

    public function show(InventoryAdjustment $adjustment)
    {
        $adjustment->load(['store:id,name', 'user:id,name', 'items.variant.product']);

        return Inertia::render('inventory/adjustments/show', [
            'adjustment' => $adjustment,
        ]);
    }

    /**
     * Genera una vista de impresión en PDF para el ajuste.
     */
    public function print(InventoryAdjustment $adjustment)
    {
        $adjustment->load(['store', 'user', 'items.variant.product', 'stockMovements']);

        // KPIs del ajuste (solo movimientos de ajuste vinculados a este documento)
        $entriesUnits = (float) $adjustment->stockMovements()
            ->where('type', 'adjustment_in')
            ->sum('quantity');

        $exitsUnits = (float) $adjustment->stockMovements()
            ->where('type', 'adjustment_out')
            ->sum(DB::raw('ABS(quantity)'));

        $netUnits = $entriesUnits - $exitsUnits;

        $valueIn  = (float) $adjustment->stockMovements()
            ->where('type', 'adjustment_in')
            ->sum('subtotal');

        $valueOut = (float) $adjustment->stockMovements()
            ->where('type', 'adjustment_out')
            ->sum('subtotal');

        $netValue = $valueIn - $valueOut;

        // Logo base64 (cacheado 24h). Ruta esperada: public/storage/logo.png
        $logoBase64 = Cache::remember('print.logo.base64', 60 * 60 * 24, function () {
            $path = public_path('storage/logo.png');
            return file_exists($path)
                ? 'data:image/png;base64,' . base64_encode(file_get_contents($path))
                : null;
        });

        // QR base64 (si está disponible el paquete)
        $qrBase64 = null;
        try {
            if (class_exists(\SimpleSoftwareIO\QrCode\Facades\QrCode::class)) {
                $png = QrCode::format('png')
                    ->size(90)->margin(0)
                    ->generate(route('inventory.adjustments.show', $adjustment));
                $qrBase64 = 'data:image/png;base64,' . base64_encode($png);
            }
        } catch (\Throwable $e) {
            $qrBase64 = null;
        }

        // Opciones de impresión
        $paper = request('paper', 'letter'); // 'letter' o 'a4'
        $isCopy = (bool) request('copy', false);
        $filename = "ajuste-{$adjustment->code}.pdf";

        $pdf = Pdf::loadView('prints.inventory_adjustment', [
            'adjustment'  => $adjustment,
            'logoBase64'  => $logoBase64,
            'qrBase64'    => $qrBase64,
            'entriesUnits' => $entriesUnits,
            'exitsUnits'  => $exitsUnits,
            'netUnits'    => $netUnits,
            'valueIn'     => $valueIn,
            'valueOut'    => $valueOut,
            'netValue'    => $netValue,
            'isCopy'      => $isCopy,
        ])->setPaper($paper);

        return request()->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    private function pdfInlineImage(string $path): ?string
    {
        try {
            // Si viene absoluta, úsala directamente
            if (is_file($path)) {
                $blob = file_get_contents($path);
            } elseif (Storage::disk('public')->exists($path)) {
                $blob = Storage::disk('public')->get($path);
            } elseif (file_exists(public_path($path))) {
                $blob = file_get_contents(public_path($path));
            } else {
                return null;
            }

            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->buffer($blob) ?: 'image/png';
            $base64 = base64_encode($blob);
            return "data:{$mime};base64,{$base64}";
        } catch (\Throwable $e) {
            return null;
        }
    }
}
