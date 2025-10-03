<?php

namespace App\Http\Controllers\Inventory;


use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StorePurchaseReturnRequest;
use App\Models\{Purchase, PurchaseReturn, ProductStockMovement};
use App\Services\PurchaseReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseReturnController extends Controller
{
    public function __construct(private PurchaseReturnService $service) {}

    public function index(Request $request)
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
        ]);

        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = $request->to   ? Carbon::parse($request->to)->endOfDay()   : now()->endOfDay();

        // KPIs desde movimientos
        $stats = DB::table('product_stock_movements')
            ->where('type', 'purchase_return_exit')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('
                COUNT(*) as count,
                SUM(ABS(quantity)) as units,
                SUM(subtotal) as value
            ')->first();

        $returns = PurchaseReturn::with(['store:id,name', 'user:id,name', 'purchase:id,code'])
            ->whereBetween('return_date', [$from, $to])
            ->latest('return_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('inventory/returns/index', [
            'returns' => $returns,
            'stats'   => [
                'count' => (int)($stats->count ?? 0),
                'units' => (float)($stats->units ?? 0),
                'value' => (float)($stats->value ?? 0),
            ],
            'filters' => [
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(),
            ],
        ]);
    }

    public function create()
    {
        // El frontend buscará la compra y luego pedirá los items “returnables”
        return Inertia::render('inventory/returns/create');
    }

    public function searchPurchases(Request $request)
    {
        $term = trim((string)$request->query('term', ''));
        if (strlen($term) < 2) return response()->json([]);

        $rows = Purchase::query()
            ->select('id', 'code', 'store_id', 'supplier_id', 'status', 'grand_total', 'created_at')
            ->with(['store:id,name', 'supplier:id,name'])
            ->where(function ($q) use ($term) {
                $q->where('code', 'ilike', "%{$term}%");
            })
            ->orderByDesc('id')
            ->limit(15)
            ->get();

        return response()->json($rows);
    }

    public function returnableItems(Purchase $purchase)
    {
        // Devolvemos los items recibidos (>0) para que el UI pueda sugerir cantidades
        $items = $purchase->items()
            ->with(['productVariant:id,sku,product_id', 'productVariant.product:id,name'])
            ->get()
            ->map(function ($it) {
                return [
                    'purchase_item_id'   => $it->id,
                    'product_variant_id' => $it->product_variant_id,
                    'sku'                => $it->productVariant?->sku,
                    'name'               => $it->productVariant?->product?->name,
                    'qty_ordered'        => (float)$it->qty_ordered,
                    'qty_received'       => (float)$it->qty_received,
                    'unit_cost'          => (float)$it->unit_cost,
                    'max_returnable'     => (float)$it->qty_received, // si llevas histórico de devueltos, réstalo aquí
                ];
            });

        return response()->json([
            'purchase' => [
                'id'      => $purchase->id,
                'code'    => $purchase->code,
                'store'   => $purchase->store?->only(['id', 'name']),
                'supplier' => $purchase->supplier?->only(['id', 'name']),
                'status'  => $purchase->status,
            ],
            'items' => $items,
        ]);
    }

    public function store(StorePurchaseReturnRequest $request)
    {
        $purchase = Purchase::findOrFail($request->input('purchase_id'));
        $userId = Auth::id();

        $return = $this->service->create($purchase, $request->validated(), $userId);

        return to_route('purchases.returns.show', $return->id)
            ->with('success', 'Devolución registrada.');
    }

    public function show(PurchaseReturn $return)
    {
        $return->load(['store:id,name', 'user:id,name', 'purchase:id,code', 'items.variant.product']);

        return Inertia::render('inventory/returns/show', [
            'return' => $return,
        ]);
    }

    public function print(PurchaseReturn $return, Request $request)
    {
        $paper = $request->string('paper')->toString() ?: 'letter'; // a4|letter
        $markCopy = (bool) $request->boolean('copy', false);
        $download = (bool) $request->boolean('download', false);

        $return->load(['store', 'user', 'purchase', 'items.variant.product']);

        $pdf = Pdf::loadView('prints.purchase_return', [
            'return'   => $return,
            'is_copy'  => $markCopy,
        ]);

        // Opciones tamaño
        if ($paper === 'a4') {
            $pdf->setPaper('a4', 'portrait');
        } else {
            $pdf->setPaper('letter', 'portrait');
        }

        $filename = "devolucion-{$return->code}.pdf";
        return $download ? $pdf->download($filename) : $pdf->stream($filename);
    }
}
