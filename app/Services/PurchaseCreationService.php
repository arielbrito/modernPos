<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseCreationService
{
    public function create(array $data, int $userId, int $storeId): Purchase
    {
        return DB::transaction(function () use ($data, $userId, $storeId) {
            $purchase = $this->createPurchaseHeader($data, $userId, $storeId);

            $totals = $this->processPurchaseItems($purchase, $data['items']);

            // CORRECCIÓN: Ahora la clave 'line_totals' existe y es correcta.
            $this->allocateLandedCosts($purchase, $totals['line_totals']);

            $this->updatePurchaseTotals($purchase, $totals);

            return $purchase;
        });
    }

    private function createPurchaseHeader(array $data, int $userId, int $storeId): Purchase
    {
        // ... (Este método estaba bien, sin cambios)
        $purchase = Purchase::create([
            'supplier_id'    => $data['supplier_id'],
            'store_id'       => $storeId,
            'code'           => 'PENDING',
            'status'         => 'draft',
            'invoice_number' => $data['invoice_number'] ?? null,
            'invoice_date'   => $data['invoice_date'] ?? null,
            'currency'       => $data['currency'],
            'exchange_rate'  => $data['exchange_rate'],
            'freight'        => $data['freight'] ?? 0,
            'other_costs'    => $data['other_costs'] ?? 0,
            'notes'          => $data['notes'] ?? null,
            'created_by'     => $userId,
        ]);

        $purchase->update([
            'code' => 'OC-' . now()->format('Ymd') . '-' . str_pad((string)$purchase->id, 5, '0', STR_PAD_LEFT)
        ]);

        return $purchase;
    }

    private function processPurchaseItems(Purchase $purchase, array $items): array
    {
        $subtotal = 0;
        // CORRECCIÓN: Estandarizamos los nombres de variables a snake_case
        $discount_total = 0;
        $tax_total = 0;
        $line_totals = [];

        foreach ($items as $row) {
            $qty = (float)$row['qty_ordered'];
            $unitCost = (float)$row['unit_cost'];
            $base = $qty * $unitCost;

            $discAmount = $row['discount_amount'] ?? ($base * ((float)($row['discount_pct'] ?? 0) / 100));
            $taxAmount = ($base - $discAmount) * ((float)($row['tax_pct'] ?? 0) / 100);
            $lineTotal = $base - $discAmount + $taxAmount;

            $item = $purchase->items()->create([
                // ... (el create estaba bien)
                'product_variant_id' => $row['product_variant_id'],
                'qty_ordered'        => $qty,
                'qty_received'       => 0,
                'unit_cost'          => $unitCost,
                'discount_pct'       => $row['discount_pct'] ?? 0,
                'discount_amount'    => $discAmount,
                'tax_pct'            => $row['tax_pct'] ?? 0,
                'tax_amount'         => $taxAmount,
                'landed_cost_alloc'  => 0,
                'line_total'         => $lineTotal,
            ]);

            $subtotal += $base;
            $discount_total += $discAmount;
            $tax_total += $taxAmount;
            $line_totals[$item->id] = $lineTotal;
        }

        // CORRECCIÓN: Usamos las variables en snake_case en el compact()
        return compact('subtotal', 'discount_total', 'tax_total', 'line_totals');
    }

    private function allocateLandedCosts(Purchase $purchase, array $line_totals): void
    {
        $landedCosts = (float)$purchase->freight + (float)$purchase->other_costs;

        // CORRECCIÓN: Cambiado el nombre del parámetro a snake_case
        if ($landedCosts <= 0 || empty($line_totals)) {
            return;
        }

        $sumOfLineTotals = array_sum($line_totals);
        if ($sumOfLineTotals == 0) return;

        foreach ($line_totals as $itemId => $total) {
            $allocated = ($total / $sumOfLineTotals) * $landedCosts;

            PurchaseItem::where('id', $itemId)->update([
                'landed_cost_alloc' => $allocated,
                'line_total' => DB::raw("line_total + $allocated"),
            ]);
        }
    }

    private function updatePurchaseTotals(Purchase $purchase, array $totals): void
    {
        $landedCosts = (float)$purchase->freight + (float)$purchase->other_costs;

        // CORRECCIÓN: Usamos las claves correctas en snake_case del array $totals
        $grandTotal = $totals['subtotal']
            - $totals['discount_total']
            + $totals['tax_total']
            + $landedCosts;

        $purchase->update([
            'subtotal'       => $totals['subtotal'],
            'discount_total' => $totals['discount_total'],
            'tax_total'      => $totals['tax_total'],
            'grand_total'    => $grandTotal,
            'paid_total'     => 0,
            'balance_total'  => $grandTotal,
        ]);
    }
}
