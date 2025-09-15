<?php

// app/Http/Controllers/Sales/SaleController.php
namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleRequest;
use App\Models\Customer;
use App\Models\Sale;
use App\Services\NcfService;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index(Request $req)
    {
        $filters = $req->only(['q', 'from', 'to', 'ncf_type', 'status', 'method']);

        // Builder base con filtros (sin order by aquí)
        $base = Sale::query()
            ->with(['store:id,code,name', 'customer:id,name'])
            ->when($req->filled('q'), function ($q) use ($req) {
                $term = trim($req->input('q'));
                $q->where(function ($qq) use ($term) {
                    $qq->where('number', 'ilike', "%{$term}%")
                        ->orWhere('ncf_number', 'ilike', "%{$term}%")
                        ->orWhere('bill_to_name', 'ilike', "%{$term}%")
                        ->orWhere('bill_to_doc_number', 'ilike', "%{$term}%");
                });
            })
            ->when($req->filled('from') || $req->filled('to'), function ($q) use ($req) {
                $from = $req->date('from')?->startOfDay();
                $to   = $req->date('to')?->endOfDay();
                if ($from && $to)      $q->whereBetween('occurred_at', [$from, $to]);
                elseif ($from)         $q->where('occurred_at', '>=', $from);
                elseif ($to)           $q->where('occurred_at', '<=', $to);
            })
            ->when($req->filled('ncf_type'), fn($q) => $q->where('ncf_type', $req->ncf_type))
            ->when($req->filled('status'), fn($q) => $q->where('status', $req->status))
            ->when($req->filled('method'), function ($q) use ($req) {
                $q->whereHas('payments', fn($p) => $p->where('method', $req->method));
            });

        // === Resumen (sin order by): usa reorder() para limpiar ordenamientos heredados
        $summary = (clone $base)
            ->reorder() // <- esto elimina cualquier ORDER BY previo
            ->selectRaw('count(*)::int as count')
            ->selectRaw('coalesce(sum(subtotal),0)::numeric(14,2)   as subtotal')
            ->selectRaw('coalesce(sum(discount_total),0)::numeric(14,2) as discounts')
            ->selectRaw('coalesce(sum(tax_total),0)::numeric(14,2)  as taxes')
            ->selectRaw('coalesce(sum(total),0)::numeric(14,2)      as total')
            ->first();

        // === Tabla/paginación (aquí sí ordenamos)
        $sales = (clone $base)
            ->orderByDesc('occurred_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sales/index', [
            'sales'   => $sales,
            'summary' => $summary,
            'filters' => $filters,
        ]);
    }
    public function preview(Request $r, NcfService $ncf)
    {
        $data = Validator::make($r->all(), [
            'customer_id'   => ['nullable', 'integer', 'exists:customers,id'],
            'currency_code' => ['required', 'string', 'exists:currencies,code'],
            'ncf_type'      => ['nullable', 'string', 'exists:ncf_types,code'],
            'lines'                 => ['required', 'array', 'min:1'],
            'lines.*.variant_id'    => ['required', 'integer', 'exists:product_variants,id'],
            'lines.*.qty'           => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price'    => ['required', 'numeric', 'gte:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'lines.*.discount_amount'  => ['nullable', 'numeric', 'gte:0'],
            'lines.*.tax_code'      => ['nullable', 'string', 'max:20'],
            'lines.*.tax_name'      => ['nullable', 'string', 'max:100'],
            'lines.*.tax_rate'      => ['nullable', 'required_with:lines.*.tax_code', 'numeric', 'gte:0'],
        ])->validate();

        // calcular totales (usa tu helper/servicio si ya lo tienes)
        $subtotal = 0;
        $discount_total = 0;
        $tax_total = 0;
        $total = 0;
        foreach ($data['lines'] as $L) {
            $lineSub = (float)$L['qty'] * (float)$L['unit_price'];
            $lineDisc = (float)($L['discount_amount'] ?? 0);
            if (!empty($L['discount_percent'])) {
                $lineDisc += round($lineSub * ((float)$L['discount_percent'] / 100), 2);
            }
            $lineTax = !empty($L['tax_rate']) ? round(($lineSub - $lineDisc) * (float)$L['tax_rate'], 2) : 0;

            $subtotal += $lineSub;
            $discount_total += $lineDisc;
            $tax_total += $lineTax;
            $total += ($lineSub - $lineDisc + $lineTax);
        }

        // NCF default / preview
        $storeId = (int)($r->query('store_id') ?? session('active_store_id'));
        $customer = !empty($data['customer_id']) ? Customer::find($data['customer_id']) : null;

        $ncfType = $data['ncf_type'] ?? $ncf->defaultTypeForCustomer($customer);
        $ncfPreview = $storeId ? $ncf->preview($storeId, $ncfType) : null;

        return response()->json([
            'ncf_type'   => $ncfType,
            'ncf_preview' => $ncfPreview,
            'totals'     => [
                'subtotal'       => round($subtotal, 2),
                'discount_total' => round($discount_total, 2),
                'tax_total'      => round($tax_total, 2),
                'total'          => round($total, 2),
            ],
        ]);
    }



    public function store(StoreSaleRequest $req, SaleService $svc)
    {
        $this->authorize('create', Sale::class);

        $data = $req->validated();

        try {

            // Completar contexto desde sesión si faltan
            $data['store_id']    = $data['store_id']    ?? (int) session('active_store_id');
            $data['register_id'] = $data['register_id'] ?? (int) session('active_register_id');
            $data['shift_id']    = $data['shift_id']    ?? (int) session('active_shift_id');

            if (!($data['store_id'] && $data['register_id'] && $data['shift_id'])) {
                throw ValidationException::withMessages([
                    'context' => 'Debes tener tienda, caja y turno activos para registrar una venta.',
                ]);
            }

            // Normalizar líneas → un solo "discount"
            // ✅ NUEVO BLOQUE (conserva todo lo que envía el front)
            $data['lines'] = array_map(function ($L) {
                return [
                    'variant_id'        => (int)$L['variant_id'],
                    'qty'               => (float)$L['qty'],
                    'unit_price'        => (float)$L['unit_price'],

                    // Mantén ambos tipos de descuento; el servicio ya sabe cómo tratarlos
                    'discount_percent'  => isset($L['discount_percent']) ? (float)$L['discount_percent'] : null,
                    'discount_amount'   => isset($L['discount_amount'])  ? (float)$L['discount_amount']  : null,

                    'tax_code'          => $L['tax_code'] ?? null,
                    'tax_name'          => $L['tax_name'] ?? null,
                    'tax_rate'          => isset($L['tax_rate']) ? (float)$L['tax_rate'] : null,
                ];
            }, $data['lines']);

            $data['payments'] = array_map(function ($P) {
                $fx = $P['fx_rate_to_sale'] ?? ($P['fx_rate'] ?? null);

                return [
                    'method'               => (string)$P['method'],
                    'amount'               => (float)$P['amount'],
                    'currency_code'        => (string)$P['currency_code'],
                    'reference'            => $P['reference'] ?? null,

                    // 👇 estos son justo los que se te estaban perdiendo
                    'fx_rate_to_sale'      => isset($fx) ? (float)$fx : null,
                    'tendered_amount'      => isset($P['tendered_amount']) ? (float)$P['tendered_amount'] : null,
                    'change_amount'        => isset($P['change_amount'])   ? (float)$P['change_amount']   : null,
                    'change_currency_code' => $P['change_currency_code'] ?? null,
                ];
            }, $data['payments']);


            $sale = $svc->create($data, $req->user()->id);

            return to_route('pos.index')
                ->with('success', "Venta #{$sale->number} registrada.")
                ->with('pos.last_sale', [
                    'id'       => $sale->id,
                    'number'   => $sale->number,
                    'total'    => (float)$sale->total,
                    'currency' => $sale->currency_code,
                ]);
        } catch (\Throwable $th) {

            return redirect()->back()->with('error', 'Error al procesar la venta: ' . $th->getMessage());
        }
    }

    public function show(Sale $sale)
    {
        $this->authorize('view', $sale);
        $sale->load([
            'store:id,code,name,rnc,phone,address',
            'register:id,name',
            'user:id,name',
            'lines:id,sale_id,sku,name,qty,unit_price,discount_percent,discount_amount,tax_rate,tax_amount,total_ex_tax,line_total',
            'payments:id,sale_id,method,amount,currency_code,fx_rate_to_sale,tendered_amount,change_amount,change_currency_code,reference,meta,created_at',
        ]);

        return Inertia::render('sales/show', [
            'sale' => $sale,
        ]);
    }
}
