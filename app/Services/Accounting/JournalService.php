<?php

namespace App\Services\Accounting;

use App\Models\{JournalEntry, JournalLine, ProductStockMovement, SaleReturn};
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class JournalService
{
    public function createForSaleReturn(SaleReturn $ret, array $map): JournalEntry
    {
        // Validaciones mínimas
        if (!$ret->exists) throw new InvalidArgumentException('SaleReturn inválido.');
        $sale = $ret->sale()->first(); // asume relación sale() en modelo
        $customerId = $sale?->customer_id;

        // Monto de costo (sumar movimientos de inventario del retorno)
        $costRefund = $ret->cost_refund;
        if ($costRefund <= 0) {
            $costRefund = (float) ProductStockMovement::query()
                ->where('source_type', SaleReturn::class)
                ->where('source_id', $ret->id)
                ->where('type', 'sale_return_in')
                ->sum('subtotal');
        }

        // Desglose de venta (si tienes columnas; si no, infiérelo)
        $subtotal = (float) ($ret->subtotal_refund ?? 0);
        $tax      = (float) ($ret->tax_refund ?? 0);
        $total    = (float) ($ret->total_refund ?? ($subtotal + $tax));

        return DB::transaction(function () use ($ret, $sale, $customerId, $map, $subtotal, $tax, $total, $costRefund) {

            $entry = JournalEntry::create([
                'entry_date'   => now()->toDateString(),
                'currency_code' => $ret->currency_code,
                'type'         => 'sale_return',
                'reference'    => (string) ($sale?->number ?? $ret->id),
                'source_type'  => SaleReturn::class,
                'source_id'    => $ret->id,
                'meta'         => [
                    'sale_id' => $sale?->id,
                    'sale_number' => $sale?->number,
                ],
            ]);

            $lines = [];

            // 1) Reversa ingreso: Debe contra-ingreso por el neto
            if ($subtotal > 0) {
                $lines[] = $this->line($entry->id, $map['sales_returns'], 'D', $subtotal, 'Reversa ingresos por devolución');
            }
            // 2) Reversa impuesto: Debe impuesto por pagar (disminuye pasivo)
            if ($tax > 0) {
                $lines[] = $this->line($entry->id, $map['tax_output'], 'D', $tax, 'Reversa ITBIS de venta devuelta');
            }

            // 3) Liquidación de cliente: Haber según método
            $settlement = $this->resolveSettlementAccount($ret, $sale, $map);
            if ($total > 0) {
                $lines[] = $this->line($entry->id, $settlement['account'], 'C', $total, $settlement['memo']);
            }

            // 4) Reversa costo: Debe inventario, Haber costo de ventas
            if ($costRefund > 0) {
                $lines[] = $this->line($entry->id, $map['inventory'], 'D', $costRefund, 'Reversa inventario por devolución');
                $lines[] = $this->line($entry->id, $map['cogs'], 'C', $costRefund, 'Reversa costo de ventas por devolución');
            }

            // Persistir líneas y validar balance
            JournalLine::insert($lines);

            $sumD = array_reduce($lines, fn($c, $l) => $c + ($l['dc'] === 'D' ? (float)$l['amount'] : 0), 0.0);
            $sumC = array_reduce($lines, fn($c, $l) => $c + ($l['dc'] === 'C' ? (float)$l['amount'] : 0), 0.0);

            if (round($sumD - $sumC, 2) !== 0.00) {
                throw new InvalidArgumentException("Asiento descuadrado: Debe={$sumD} / Haber={$sumC}");
            }

            // Vincular con el retorno
            $ret->update(['journal_entry_id' => $entry->id, 'cost_refund' => round($costRefund, 2)]);

            return $entry->fresh('lines');
        });
    }

    protected function line(int $entryId, string $acc, string $dc, float $amount, string $memo): array
    {
        return [
            'journal_entry_id' => $entryId,
            'account_code'     => $acc,
            'dc'               => $dc,
            'amount'           => round($amount, 2),
            'memo'             => $memo,
            'created_at'       => now(),
            'updated_at'       => now(),
        ];
    }

    /**
     * Determina la cuenta de liquidación para la devolución:
     * - cash_refund => caja (sale por caja)
     * - por defecto => crédito a favor del cliente (pasivo) o AR
     */
    protected function resolveSettlementAccount(SaleReturn $ret, $sale, array $map): array
    {
        $hasCashRefund = ($ret->meta['cash_refund'] ?? null) || request()->input('cash_refund.amount'); // flexible

        if ($hasCashRefund) {
            return ['account' => $map['cash_main'], 'memo' => 'Reembolso en efectivo/tarjeta'];
        }

        $default = config('accounting.returns.default_settlement', 'customer_credit');
        return match ($default) {
            'accounts_receivable' => ['account' => $map['accounts_receivable'], 'memo' => 'Ajuste a cuentas por cobrar'],
            'customer_credit'     => ['account' => $map['customer_credit_liability'], 'memo' => 'Crédito a favor del cliente'],
            default               => ['account' => $map['customer_credit_liability'], 'memo' => 'Crédito a favor del cliente'],
        };
    }
}
