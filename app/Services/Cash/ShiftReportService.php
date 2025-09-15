<?php

namespace App\Services\Cash;

use App\Models\CashShift;
use App\Models\CashCount;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\CashMovement; // 👈 para obtener el nombre real de la tabla
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ShiftReportService
{
    public function build(int $shiftId): array
    {
        /** @var CashShift $shift */
        $shift = CashShift::query()
            ->with(['register:id,store_id,name', 'register.store:id,code,name'])
            ->findOrFail($shiftId);

        // ===== Ventas =====
        $salesQ = Sale::query()->where('shift_id', $shift->id);

        $salesCount = (clone $salesQ)->count();
        $salesTotalsByCurrency = (clone $salesQ)
            ->selectRaw('currency_code, COUNT(*)::int as count, COALESCE(SUM(total),0)::numeric(14,2) as total')
            ->groupBy('currency_code')
            ->orderBy('currency_code')
            ->get();

        // ===== Pagos por método/moneda =====
        $payments = SalePayment::query()
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->where('sales.shift_id', $shift->id)
            ->selectRaw("
                sale_payments.method,
                sale_payments.currency_code,
                COUNT(*)::int as count,
                COALESCE(SUM(sale_payments.amount),0)::numeric(14,2) as amount,
                COALESCE(SUM(
                    CASE
                        WHEN sale_payments.currency_code = sales.currency_code THEN sale_payments.amount
                        ELSE sale_payments.amount * COALESCE(sale_payments.fx_rate_to_sale, 0)
                    END
                ),0)::numeric(14,2) as amount_in_sale_ccy
            ")
            ->groupBy('sale_payments.method', 'sale_payments.currency_code')
            ->orderBy('sale_payments.method')
            ->orderBy('sale_payments.currency_code')
            ->get();

        $cashIn  = (clone $payments)->where('method', 'cash')->sum('amount');
        $changeOutFromPayments = SalePayment::query()
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->where('sales.shift_id', $shift->id)
            ->where('sale_payments.method', 'cash')
            ->sum('sale_payments.change_amount');

        // ===== NOMBRE REAL de la tabla de movimientos =====
        $crmTable = (new CashMovement())->getTable(); // p.ej. "cash_movements"
        $hasCrm   = Schema::hasTable($crmTable);

        // ===== Apertura (conteo) por moneda =====
        $openingByCcy = CashCount::where('shift_id', $shift->id)
            ->where('type', 'opening')
            ->selectRaw('currency_code, SUM(total_counted) as t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code');

        // ===== Entradas/Salidas por moneda desde movimientos de caja =====
        $insByCcy = $hasCrm
            ? DB::table($crmTable)
            ->where('shift_id', $shift->id)
            ->where('direction', 'in')
            ->selectRaw('currency_code, SUM(amount) as t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code')
            : collect();

        // Egresos operativos (excluye devueltas)
        $outsOperativeByCcy = $hasCrm
            ? DB::table($crmTable)
            ->where('shift_id', $shift->id)
            ->where('direction', 'out')
            ->where(function ($q) {
                $q->whereNull('reason')->orWhere('reason', '<>', 'change');
            })
            ->selectRaw('currency_code, SUM(amount) as t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code')
            : collect();

        // Devueltas (reason='change')
        $changeByCcy = $hasCrm
            ? DB::table($crmTable)
            ->where('shift_id', $shift->id)
            ->where('direction', 'out')
            ->where('reason', 'change')
            ->selectRaw('currency_code, SUM(amount) as t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code')
            : collect();

        // Salidas totales = egresos operativos + devueltas
        $outsTotalByCcy = $outsOperativeByCcy->map(function ($v, $k) use ($changeByCcy) {
            return (float)$v + (float)($changeByCcy[$k] ?? 0);
        });

        // ===== Conteo de CIERRE (si existe) =====
        $countedByCcy = CashCount::where('shift_id', $shift->id)
            ->where('type', 'closing')
            ->selectRaw('currency_code, SUM(total_counted) as t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code');

        // ===== Resumen por moneda =====
        $ccys = collect([$openingByCcy, $insByCcy, $outsTotalByCcy, $countedByCcy])
            ->flatMap(fn($p) => $p->keys())
            ->unique()
            ->values();

        $byCurrency = [];
        $totOpening = $totIncome = $totOuts = $totChange = $totExpected = $totCounted = $totVar = 0.0;

        foreach ($ccys as $ccy) {
            $opening = (float)($openingByCcy[$ccy] ?? 0);
            $income  = (float)($insByCcy[$ccy] ?? 0);
            $egress  = (float)($outsOperativeByCcy[$ccy] ?? 0);
            $change  = (float)($changeByCcy[$ccy] ?? 0);

            // Estimado = apertura + entradas - (egresos + devueltas)
            $expected = $opening + $income - ((float)($outsTotalByCcy[$ccy] ?? 0));

            // Si turno está CERRADO y no hay conteo, asumimos contado = estimado (variación 0)
            $hasCount = array_key_exists($ccy, $countedByCcy->toArray());
            $counted  = $hasCount ? (float)$countedByCcy[$ccy] : ($shift->status === 'closed' ? $expected : 0.0);

            $variance = round($counted - $expected, 2);

            $byCurrency[$ccy] = [
                'opening'  => round($opening, 2),
                'income'   => round($income, 2),
                'expense'  => round($egress, 2),   // sin devueltas
                'change'   => round($change, 2),   // devueltas
                'expected' => round($expected, 2),
                'counted'  => round($counted, 2),
                'variance' => $variance,
            ];

            $totOpening  += $opening;
            $totIncome   += $income;
            $totOuts     += $egress;
            $totChange   += $change;
            $totExpected += $expected;
            $totCounted  += $counted;
            $totVar      += $variance;
        }

        $summary = [
            'by_currency' => $byCurrency,
            'totals' => [
                'opening'  => round($totOpening, 2),
                'income'   => round($totIncome, 2),
                'expense'  => round($totOuts, 2),
                'change'   => round($totChange, 2),
                'expected' => round($totExpected, 2),
                'counted'  => round($totCounted, 2),
                'variance' => round($totVar, 2),
            ],
        ];

        // ====== “Conteo del cajero” (detalle por denominación) ======
        // Apertura
        $openingLines = DB::table('cash_count_lines as l')
            ->join('cash_counts as c', 'c.id', '=', 'l.count_id')
            ->join('cash_denominations as d', 'd.id', '=', 'l.denomination_id')
            ->where('c.shift_id', $shift->id)
            ->where('c.type', 'opening')
            ->orderBy('d.currency_code')
            ->orderByDesc('d.kind')
            ->orderByDesc('d.value')
            ->get(['d.currency_code', 'd.value', 'd.kind', 'l.quantity', 'l.subtotal']);

        $openingCounts = $this->groupCountLines($openingLines);

        // Cierre
        $closingLines = DB::table('cash_count_lines as l')
            ->join('cash_counts as c', 'c.id', '=', 'l.count_id')
            ->join('cash_denominations as d', 'd.id', '=', 'l.denomination_id')
            ->where('c.shift_id', $shift->id)
            ->where('c.type', 'closing')
            ->orderBy('d.currency_code')
            ->orderByDesc('d.kind')
            ->orderByDesc('d.value')
            ->get(['d.currency_code', 'd.value', 'd.kind', 'l.quantity', 'l.subtotal']);

        $closingCounts = $this->groupCountLines($closingLines);

        // ===== Movimientos netos (opcional) =====
        $cashMovements = null;
        if ($hasCrm) {
            $movRows = DB::table($crmTable)
                ->where('shift_id', $shift->id)
                ->selectRaw("
                    currency_code,
                    SUM(CASE WHEN direction = 'in'  THEN amount ELSE 0 END)::numeric(14,2) as cash_in,
                    SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END)::numeric(14,2) as cash_out
                ")
                ->groupBy('currency_code')
                ->orderBy('currency_code')
                ->get();

            $cashMovements = $movRows->map(function ($r) {
                return [
                    'currency_code' => $r->currency_code,
                    'cash_in'  => (float)$r->cash_in,
                    'cash_out' => (float)$r->cash_out,
                    'net'      => round((float)$r->cash_in - (float)$r->cash_out, 2),
                ];
            });
        }

        return [
            'shift' => [
                'id'        => $shift->id,
                'status'    => $shift->status,
                'opened_at' => $shift->opened_at ?? $shift->created_at,
                'closed_at' => $shift->closed_at ?? null,
                'register'  => [
                    'id'   => $shift->register->id,
                    'name' => $shift->register->name ?? ('Caja #' . $shift->register->id),
                ],
                'store'     => [
                    'id'   => $shift->register->store->id,
                    'code' => $shift->register->store->code,
                    'name' => $shift->register->store->name,
                ],
            ],
            'sales' => [
                'count' => $salesCount,
                'totals_by_currency' => $salesTotalsByCurrency,
            ],
            'payments' => [
                'rows' => $payments,
                'cash_in' => (float)$cashIn,
                'cash_change_out' => (float)$changeOutFromPayments,
            ],
            'summary'        => $summary,          // 👈 resumen por moneda
            'counts'         => [                  // 👈 NUEVO bloque: conteos por denominación
                'opening' => $openingCounts,
                'closing' => $closingCounts,
            ],
            'cash_movements' => $cashMovements,    // opcional
        ];
    }

    /** Agrupa líneas de conteo en: ['by_currency' => [ccy => ['total'=>x,'lines'=>[...] ] ], 'totals'=>x] */
    protected function groupCountLines($rows): array
    {
        $by = [];
        $grand = 0.0;

        foreach ($rows as $r) {
            $by[$r->currency_code]['lines'][] = [
                'denomination' => (float)$r->value,
                'kind'         => $r->kind, // 'bill'|'coin'
                'qty'          => (int)$r->quantity,
                'subtotal'     => (float)$r->subtotal,
            ];
            $by[$r->currency_code]['total'] = ($by[$r->currency_code]['total'] ?? 0) + (float)$r->subtotal;
            $grand += (float)$r->subtotal;
        }

        // Asegura estructura consistente
        foreach ($by as $ccy => $data) {
            $by[$ccy]['total']  = round($data['total'] ?? 0, 2);
            $by[$ccy]['lines']  = $data['lines'] ?? [];
        }

        return [
            'by_currency' => $by,
            'totals'      => round($grand, 2),
        ];
    }

    /** Export plano de pagos */
    public function paymentsFlat(int $shiftId): Collection
    {
        return SalePayment::query()
            ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
            ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
            ->where('sales.shift_id', $shiftId)
            ->orderByDesc('sale_payments.id')
            ->get([
                'sale_payments.id',
                'sale_payments.method',
                'sale_payments.currency_code',
                'sale_payments.amount',
                'sale_payments.fx_rate_to_sale',
                'sale_payments.tendered_amount',
                'sale_payments.change_amount',
                'sale_payments.change_currency_code',
                'sales.number as sale_number',
                'sales.total as sale_total',
                'sales.currency_code as sale_currency',
                'sales.occurred_at',
                DB::raw("COALESCE(customers.name, sales.bill_to_name) as customer"),
            ]);
    }
}
