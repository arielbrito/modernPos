<?php

namespace App\Services;

use App\Models\{Sale, SaleLine, SaleReturn, SaleReturnLine, Inventory, ProductStockMovement, CashShift};
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

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
        $sale   = Sale::with('lines')->findOrFail((int)$payload['sale_id']);

        if ($sale->status !== 'completed') {
            throw new InvalidArgumentException('La venta no permite devolución.');
        }

        $lines = $payload['lines'] ?? [];
        if (empty($lines)) {
            throw new InvalidArgumentException('No se recibieron líneas para devolución.');
        }

        // Tomamos turno abierto desde sesión
        $shiftId    = session('active_shift_id');
        $registerId = session('active_register_id');
        if (!$shiftId || !$registerId) {
            throw new InvalidArgumentException('No hay turno/caja activos para registrar devolución.');
        }

        // Valida turno
        $shift = CashShift::open()->lockForUpdate()->find($shiftId);
        if (!$shift || $shift->register_id != $registerId) {
            throw new InvalidArgumentException('Turno inválido para devolución.');
        }

        return DB::transaction(function () use ($sale, $lines, $payload, $userId, $shift) {

            $return = SaleReturn::create([
                'sale_id'       => $sale->id,
                'user_id'       => $userId,
                'currency_code' => $sale->currency_code,
                'total_refund'  => 0,
                'reason'        => $payload['reason'] ?? null,
                'meta'          => null,
            ]);

            $totalRefund = 0;

            foreach ($lines as $i => $row) {
                /** @var SaleLine $orig */
                $orig = $sale->lines->firstWhere('id', (int)$row['sale_line_id']);
                if (!$orig) throw new InvalidArgumentException("Línea inválida en devolución (#" . ($i + 1) . ").");

                $qty = (float)$row['qty'];
                if ($qty <= 0 || $qty > (float)$orig->qty) {
                    throw new InvalidArgumentException("Cantidad inválida en devolución para línea #{$orig->id}.");
                }

                $unitTotal = round((float)$orig->line_total / max(1, (float)$orig->qty), 6);
                $refundAmount = round($unitTotal * $qty, 2);
                $totalRefund += $refundAmount;

                SaleReturnLine::create([
                    'sale_return_id' => $return->id,
                    'sale_line_id'   => $orig->id,
                    'qty'            => $qty,
                    'refund_amount'  => $refundAmount,
                    'reason'         => $row['reason'] ?? null,
                ]);

                // Regresar stock
                $inv = Inventory::where('store_id', $sale->store_id)
                    ->where('product_variant_id', $orig->variant_id)
                    ->lockForUpdate()
                    ->first();

                if (!$inv) {
                    // crear si no existe
                    $inv = Inventory::create([
                        'store_id' => $sale->store_id,
                        'product_variant_id' => $orig->variant_id,
                        'quantity' => 0,
                        'stock_alert_threshold' => 5,
                    ]);
                }
                $inv->increment('quantity', $qty);

                // Movimiento (ajuste de entrada por devolución)
                ProductStockMovement::create([
                    'product_variant_id' => $orig->variant_id,
                    'store_id'           => $sale->store_id,
                    'type'               => 'adjustment_in',
                    'quantity'           => $qty,
                    'unit_price'         => $orig->unit_price, // o average_cost actual si prefieres
                    'subtotal'           => round($orig->unit_price * $qty, 2),
                    'user_id'            => $userId,
                    'source_type'        => SaleReturn::class,
                    'source_id'          => $return->id,
                    'notes'              => "Devolución de venta #{$sale->number}",
                ]);
            }

            $return->update(['total_refund' => round($totalRefund, 2)]);

            // Si hay reembolso en efectivo => movimiento out
            if (!empty($payload['cash_refund']) && (float)($payload['cash_refund']['amount'] ?? 0) > 0) {
                $ccy   = strtoupper($payload['cash_refund']['currency_code'] ?? $sale->currency_code);
                $amt   = (float)$payload['cash_refund']['amount'];
                $ref   = $payload['cash_refund']['reference'] ?? "REF {$sale->number}";

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

            return $return->fresh(['lines']);
        });
    }
}
