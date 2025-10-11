<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Models\SaleReturn;
use App\Services\SaleReturnService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class SaleReturnController extends Controller
{

    public function index(Request $req)
    {
        $this->authorize('viewAny', SaleReturn::class);

        $q     = trim((string) $req->input('q', ''));
        $from  = $req->input('from');
        $to    = $req->input('to');
        $store = $req->input('store_id');

        $query = SaleReturn::query()
            ->with(['sale:id,number,customer_id,store_id', 'sale.customer:id,name'])
            ->when($q !== '', function ($qq) use ($q) {
                $qq->whereHas('sale', fn($s) => $s->where('number', 'ilike', "%{$q}%")
                    ->orWhereHas('customer', fn($c) => $c->where('name', 'ilike', "%{$q}%")));
            })
            ->when($store, fn($qq) => $qq->whereHas('sale', fn($s) => $s->where('store_id', $store)))
            ->when($from, fn($qq) => $qq->whereDate('created_at', '>=', $from))
            ->when($to,   fn($qq) => $qq->whereDate('created_at', '<=', $to))
            ->orderByDesc('id');

        $returns = $query->paginate(20)->withQueryString();

        // KPIs
        $base      = (clone $query)->get(['total_refund', 'tax_refund', 'cost_refund']);
        $k_count   = $base->count();
        $k_total   = (float) $base->sum('total_refund');
        $k_tax     = (float) $base->sum('tax_refund');
        $k_cost    = (float) $base->sum('cost_refund');
        $k_avg     = $k_count ? round($k_total / $k_count, 2) : 0.00;
        $k_marginImpact = round($k_total - $k_tax - $k_cost, 2);

        return Inertia::render('sales/returns/index', [
            'filters' => compact('q', 'from', 'to', 'store'),
            'kpis' => [
                'count' => $k_count,
                'total' => round($k_total, 2),
                'average' => $k_avg,
                'tax' => round($k_tax, 2),
                'cost' => round($k_cost, 2),
                'marginImpact' => $k_marginImpact,
            ],
            'returns' => $returns->through(function ($r) {
                return [
                    'id' => $r->id,
                    'sale_number' => $r->sale?->number,
                    'customer' => $r->sale?->customer?->name,
                    'currency_code' => $r->currency_code,
                    'total_refund' => (float)$r->total_refund,
                    'tax_refund' => (float)($r->tax_refund ?? 0),
                    'cost_refund' => (float)($r->cost_refund ?? 0),
                    'created_at' => $r->created_at?->toDateTimeString(),
                ];
            }),
        ]);
    }

    public function create(Sale $sale)
    {
        $this->authorize('refund', $sale);


        // Traer líneas con cantidad disponible para devolver (qty - ya devuelto)
        $lines = SaleLine::query()
            ->select('id', 'variant_id', 'name', 'sku', 'qty', 'unit_price', 'line_total',  'tax_amount', 'discount_amount')
            ->where('sale_id', $sale->id)
            ->orderBy('id')
            ->get()
            ->map(function ($l) use ($sale) {
                $already = DB::table('sale_return_lines')
                    ->join('sale_returns', 'sale_return_lines.sale_return_id', '=', 'sale_returns.id')
                    ->where('sale_returns.sale_id', $sale->id)
                    ->where('sale_return_lines.sale_line_id', $l->id)
                    ->sum('sale_return_lines.qty');
                $remaining = max(0, (float)$l->qty - (float)$already);
                return [
                    'id' => $l->id,
                    'variant_id' => $l->variant_id,
                    'name' => $l->name,
                    'sku' => $l->sku,
                    'qty' => (float)$l->qty,
                    'remaining_qty' => (float)$remaining,
                    'unit_price' => (float)$l->unit_price,
                    'line_total' => (float)($l->line_total ?? 0),
                    // 'line_subtotal' => (float)($l->line_subtotal ?? $l->line_total ?? 0),
                    'tax_amount' => (float)($l->tax_total ?? 0),
                    'discount_amount' => (float)($l->discount_total ?? 0),
                ];
            });


        return Inertia::render('sales/returns/create', [
            'sale' => [
                'id' => $sale->id,
                'number' => $sale->number,
                'customer_id' => $sale->customer_id,
                'currency_code' => $sale->currency_code,
                'status' => $sale->status,
                'store_id' => $sale->store_id,
            ],
            'lines' => $lines,
            'defaults' => [
                'cash_refund_enabled' => true,
                'currency_code' => $sale->currency_code,
            ],
        ]);
    }

    // Búsqueda por número de venta (para un buscador en UI)
    public function findSale(Request $req)
    {
        $term = trim((string)$req->input('q', ''));
        $sale = Sale::query()
            ->where('number', $term)
            ->orWhere('id', is_numeric($term) ? (int)$term : 0)
            ->first();


        if (!$sale) {
            return response()->json(['ok' => false, 'message' => 'Venta no encontrada'], 404);
        }
        return response()->json(['ok' => true, 'sale_id' => $sale->id, 'redirect' => route('sales.returns.create', $sale)]);
    }

    public function store(StoreSaleReturnRequest $req, SaleReturnService $svc)
    {
        $sale = Sale::findOrFail((int)$req->input('sale_id'));
        $this->authorize('refund', $sale);

        try {
            $ret = $svc->create($req->validated(), $req->user()->id);
            return response()->json(['ok' => true, 'return_id' => $ret->id, 'total_refund' => $ret->total_refund], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }


    public function show(SaleReturn $saleReturn)
    {
        $saleReturn->load(['lines', 'sale']);
        return Inertia::render('sales/returns/show', [
            'return' => [
                'id' => $saleReturn->id,
                'sale_id' => $saleReturn->sale_id,
                'sale_number' => $saleReturn->sale?->number,
                'currency_code' => $saleReturn->currency_code,
                'total_refund' => (float)$saleReturn->total_refund,
                'subtotal_refund' => (float)($saleReturn->subtotal_refund ?? 0),
                'tax_refund' => (float)($saleReturn->tax_refund ?? 0),
                'discount_refund' => (float)($saleReturn->discount_refund ?? 0),
                'cost_refund' => (float)($saleReturn->cost_refund ?? 0),
                'created_at' => $saleReturn->created_at?->toDateTimeString(),
            ],
            'lines' => $saleReturn->lines->map(fn($l) => [
                'id' => $l->id,
                'sale_line_id' => $l->sale_line_id,
                'qty' => (float)$l->qty,
                'refund_amount' => (float)$l->refund_amount,
                'subtotal_part' => (float)($l->subtotal_part ?? 0),
                'tax_part' => (float)($l->tax_part ?? 0),
                'discount_part' => (float)($l->discount_part ?? 0),
                'reason' => $l->reason,
            ]),
        ]);
    }


    public function pdf(SaleReturn $saleReturn)
    {
        $saleReturn->load(['sale', 'lines']);
        $pdf = Pdf::loadView('pdf.sale_return', ['ret' => $saleReturn]);
        return $pdf->download('sale-return-' . $saleReturn->id . '.pdf');
    }

    public function excel(SaleReturn $saleReturn)
    {
        return Excel::download(new \App\Exports\SaleReturnExport($saleReturn->id), 'sale-return-' . $saleReturn->id . '.xlsx');
    }

    public function exportListExcel(Request $req)
    {
        return Excel::download(new \App\Exports\SaleReturnListExport($req->all()), 'sale-returns-list.xlsx');
    }
}
