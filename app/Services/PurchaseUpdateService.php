<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseUpdateService
{
    public function update(Purchase $purchase, array $data): Purchase
    {
        if ($purchase->status !== 'draft') {
            throw new InvalidArgumentException('Solo se pueden editar compras en estado de borrador.');
        }

        return DB::transaction(function () use ($purchase, $data) {
            // 1. Sincronizar los items
            $this->syncItems($purchase, $data['items']);

            // 2. Actualizar la cabecera con los datos directos
            $purchase->update([
                'supplier_id'    => $data['supplier_id'],
                'invoice_number' => $data['invoice_number'] ?? null,
                'invoice_date'   => $data['invoice_date'] ?? null,
                'currency'       => $data['currency'],
                'exchange_rate'  => $data['exchange_rate'],
                'freight'        => $data['freight'] ?? 0,
                'other_costs'    => $data['other_costs'] ?? 0,
                'notes'          => $data['notes'] ?? null,
            ]);

            // 3. Recalcular y actualizar todos los totales
            $this->recalculateAndUpdateTotals($purchase);

            return $purchase;
        });
    }

    private function syncItems(Purchase $purchase, array $itemsData): void
    {
        $existingItemIds = $purchase->items->pluck('id')->all();
        $incomingItemIds = collect($itemsData)->pluck('id')->filter()->all();

        // Borrar items que ya no vienen en la petición
        $idsToDelete = array_diff($existingItemIds, $incomingItemIds);
        if (!empty($idsToDelete)) {
            $purchase->items()->whereIn('id', $idsToDelete)->delete();
        }

        foreach ($itemsData as $itemData) {
            $base = (float)$itemData['qty_ordered'] * (float)$itemData['unit_cost'];
            $discAmount = $base * ((float)($itemData['discount_pct'] ?? 0) / 100);
            $taxAmount = ($base - $discAmount) * ((float)($itemData['tax_pct'] ?? 0) / 100);

            $payload = [
                'product_variant_id' => $itemData['product_variant_id'],
                'qty_ordered'        => $itemData['qty_ordered'],
                'unit_cost'          => $itemData['unit_cost'],
                'discount_pct'       => $itemData['discount_pct'] ?? 0,
                'discount_amount'    => $discAmount,
                'tax_pct'            => $itemData['tax_pct'] ?? 0,
                'tax_amount'         => $taxAmount,
                'line_total'         => $base - $discAmount + $taxAmount,
            ];

            // Actualizar item existente o crear uno nuevo
            $purchase->items()->updateOrCreate(
                ['id' => $itemData['id'] ?? null],
                $payload
            );
        }
    }

    private function recalculateAndUpdateTotals(Purchase $purchase): void
    {
        $purchase->load('items'); // Recargamos los items actualizados

        $subtotal = $purchase->items->sum(fn($item) => $item->qty_ordered * $item->unit_cost);
        $discount_total = $purchase->items->sum('discount_amount');
        $tax_total = $purchase->items->sum('tax_amount');
        $landed_costs = (float)$purchase->freight + (float)$purchase->other_costs;

        // Prorratear costos de flete (si existen)
        $grand_total_items = $purchase->items->sum('line_total');
        if ($landed_costs > 0 && $grand_total_items > 0) {
            foreach ($purchase->items as $item) {
                $allocated = ($item->line_total / $grand_total_items) * $landed_costs;
                $item->update([
                    'landed_cost_alloc' => $allocated,
                    'line_total' => DB::raw("line_total + $allocated"),
                ]);
            }
        }

        $grand_total = $subtotal - $discount_total + $tax_total + $landed_costs;

        $purchase->update([
            'subtotal'       => $subtotal,
            'discount_total' => $discount_total,
            'tax_total'      => $tax_total,
            'grand_total'    => $grand_total,
            'balance_total'  => $grand_total - $purchase->paid_total, // Balance considera pagos existentes
        ]);
    }
}
