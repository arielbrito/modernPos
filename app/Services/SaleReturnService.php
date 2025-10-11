<?php

namespace App\Services;

use App\Models\{Sale, SaleLine, SaleReturn, SaleReturnLine, Inventory, ProductStockMovement, CashShift};
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Illuminate\Support\Arr;

class SaleReturnService
{
    public function __construct(protected CashRegisterService $cash) {}

    /**
     * $payload:
     * - sale_id
     * - lines: [ ['sale_line_id'=>int,'qty'=>float,'reason'=>?string], ... ]
     * - cash_refund?: ['currency_code'=>'DOP','amount'=>float,'reference'=>?string]  (opcional)
     * - reason?: string
     */
    public function create(array $payload, ?int $userId = null): SaleReturn
    {
        $userId ??= Auth::id();
        $saleId = (int) $payload['sale_id'];

        // Bloquea la venta y sus líneas relevantes para evitar carreras
        return DB::transaction(function () use ($saleId, $payload, $userId) {

            $sale = Sale::with(['lines' => function ($q) {
                $q->select('id', 'sale_id', 'variant_id', 'qty', 'unit_price', 'line_total',  'tax_amount', 'discount_amount');
            }])->lockForUpdate()->findOrFail($saleId);

            if ($sale->status !== 'completed') {
                throw new InvalidArgumentException('La venta no permite devolución.');
            }

            $linesInPayload = collect($payload['lines'] ?? [])
                ->map(fn($r) => (int)$r['sale_line_id'])
                ->all();

            // Bloquear también directamente las filas en DB para mayor seguridad
            DB::table('sale_lines')->whereIn('id', $linesInPayload)->lockForUpdate()->get();

            // Turno/caja activos (ya lo tenías)
            $shiftId    = (int) session('active_shift_id');
            $registerId = (int) session('active_register_id');
            if (!$shiftId || !$registerId) {
                throw new InvalidArgumentException('No hay turno/caja activos para registrar devolución.');
            }

            $shift = CashShift::with('register')->lockForUpdate()->find($shiftId);

            if (!$shift) {
                throw new InvalidArgumentException('No existe el turno indicado en sesión.');
            }
            if (method_exists($shift, 'isOpen')) {
                if (!$shift->isOpen()) {
                    throw new InvalidArgumentException('El turno no está abierto.');
                }
            } else {
                if (($shift->status ?? null) !== 'open' || !is_null($shift->closed_at ?? null) === false) {
                    throw new InvalidArgumentException('El turno no está abierto.');
                }
            }

            // Caja debe coincidir
            if ((int)$shift->register_id !== $registerId) {
                throw new InvalidArgumentException("Turno inválido: la caja activa ({$registerId}) no coincide con la del turno ({$shift->register_id}).");
            }

            // Tienda del turno = tienda de la venta (usa store del register si no hay en shift)
            $shiftStoreId = (int) ($shift->store_id ?? optional($shift->register)->store_id);
            if ($shiftStoreId !== (int)$sale->store_id) {
                throw new InvalidArgumentException("Turno inválido: la tienda del turno ({$shiftStoreId}) no coincide con la de la venta ({$sale->store_id}).");
            }

            $return = SaleReturn::create([
                'sale_id'       => $sale->id,
                'user_id'       => $userId,
                'currency_code' => $sale->currency_code,
                'total_refund'  => 0,
                'cost_refund'   => 0,
                'reason'        => $payload['reason'] ?? null,
                'meta'          => null,
            ]);

            $totals = [
                'total'    => 0.0,
                'subtotal' => 0.0,
                'tax'      => 0.0,
                'discount' => 0.0,
                'cost'     => 0.0,
            ];

            foreach ($payload['lines'] as $i => $row) {
                $lineId = (int)$row['sale_line_id'];
                $orig   = $sale->lines->firstWhere('id', $lineId);
                if (!$orig) throw new InvalidArgumentException("Línea inválida en devolución (#" . ($i + 1) . ").");

                $qty = (float)$row['qty'];
                if ($qty <= 0) {
                    throw new InvalidArgumentException("Cantidad inválida en devolución para línea #{$orig->id}.");
                }

                // Cantidad ya devuelta previamente (todas las devoluciones históricas)
                $alreadyReturned = (float) DB::table('sale_return_lines')
                    ->join('sale_returns', 'sale_return_lines.sale_return_id', '=', 'sale_returns.id')
                    ->where('sale_returns.sale_id', $sale->id)
                    ->where('sale_return_lines.sale_line_id', $orig->id)
                    ->sum('sale_return_lines.qty');

                $remaining = max(0, (float)$orig->qty - $alreadyReturned);
                if ($qty > $remaining) {
                    throw new InvalidArgumentException("Cantidad excede lo disponible para devolver en línea #{$orig->id}. Restante: {$remaining}");
                }

                // Desglose proporcional seguro (usa campos si existen; fallback a line_total)
                $perUnitTotal    = round(((float)($orig->line_total ?? 0)) / max(1, (float)$orig->qty), 6);
                $perUnitSubtotal = round(((float)($orig->line_subtotal ?? $orig->line_total)) / max(1, (float)$orig->qty), 6);
                $perUnitTax      = round(((float)($orig->tax_total ?? 0)) / max(1, (float)$orig->qty), 6);
                $perUnitDiscount = round(((float)($orig->discount_total ?? 0)) / max(1, (float)$orig->qty), 6);

                $refundAmount  = round($perUnitTotal    * $qty, 2);
                $subtotalPart  = round($perUnitSubtotal * $qty, 2);
                $taxPart       = round($perUnitTax      * $qty, 2);
                $discountPart  = round($perUnitDiscount * $qty, 2);

                SaleReturnLine::create([
                    'sale_return_id' => $return->id,
                    'sale_line_id'   => $orig->id,
                    'qty'            => $qty,
                    'refund_amount'  => $refundAmount,
                    'subtotal_part'  => $subtotalPart,
                    'tax_part'       => $taxPart,
                    'discount_part'  => $discountPart,
                    'reason'         => Arr::get($row, 'reason'),
                ]);

                // Inventario (costo configurable)
                $unitCostForValuation = $orig->unit_cost
                    ?? app('average.cost')->for($orig->variant_id, $sale->store_id) // si tienes servicio, opcional
                    ?? $orig->unit_price;

                $inv = Inventory::where('store_id', $sale->store_id)
                    ->where('product_variant_id', $orig->variant_id)
                    ->lockForUpdate()
                    ->first();

                if (!$inv) {
                    $inv = Inventory::create([
                        'store_id' => $sale->store_id,
                        'product_variant_id' => $orig->variant_id,
                        'quantity' => 0,
                        'stock_alert_threshold' => 5,
                    ]);
                }
                $inv->increment('quantity', $qty);

                ProductStockMovement::create([
                    'product_variant_id' => $orig->variant_id,
                    'store_id'           => $sale->store_id,
                    'type'               => 'sale_return_in', // más semántico que 'adjustment_in'
                    'quantity'           => $qty,
                    'unit_price'         => $unitCostForValuation,
                    'subtotal'           => round($unitCostForValuation * $qty, 2),
                    'user_id'            => $userId,
                    'source_type'        => SaleReturn::class,
                    'source_id'          => $return->id,
                    'notes'              => "Devolución de venta #{$sale->number}",
                ]);


                // Acumular totales
                $totals['cost'] += round($unitCostForValuation * $qty, 2);
                $totals['total']    += $refundAmount;
                $totals['subtotal'] += $subtotalPart;
                $totals['tax']      += $taxPart;
                $totals['discount'] += $discountPart;
            }

            // Actualiza totales del retorno
            $return->update([
                'total_refund'     => round($totals['total'], 2),
                'cost_refund'      => round($totals['cost'], 2),
                'subtotal_refund'  => round($totals['subtotal'], 2),
                'tax_refund'       => round($totals['tax'], 2),
                'discount_refund'  => round($totals['discount'], 2),
            ]);

            // Reembolso en efectivo (si aplica)
            $cashRefund = $payload['cash_refund'] ?? null;
            if ($cashRefund && (float)($cashRefund['amount'] ?? 0) > 0) {
                $ccy = strtoupper($cashRefund['currency_code'] ?? $sale->currency_code);
                $amt = (float)$cashRefund['amount'];
                $ref = $cashRefund['reference'] ?? "REF {$sale->number}";

                $this->cash->movement(
                    shiftId: $shift->id,
                    userId: $userId,
                    direction: 'out',
                    currency: $ccy,
                    amount: round($amt, 2),
                    reason: 'refund',
                    reference: $ref,
                    meta: ['sale_id' => $sale->id, 'sale_return_id' => $return->id],
                    source: $return,
                );
            }

            if (!empty($payload['cash_refund']) && (float)($payload['cash_refund']['amount'] ?? 0) > 0) {
                $return->update([
                    'meta' => array_merge($return->meta ?? [], ['cash_refund' => $payload['cash_refund']])
                ]);
            }


            // (Opcional) Crédito a favor del cliente, si no hay cash_refund:
            // app(CustomerBalanceService::class)->credit($sale->customer_id, $return->total_refund, [...]);

            // Disparar evento para contabilidad
            event(new \App\Events\Sales\SaleReturned($return->id));

            return $return->fresh(['lines']);
        });
    }
}
