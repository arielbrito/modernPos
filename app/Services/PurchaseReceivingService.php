<?php

namespace App\Services;

use App\Models\{Purchase, PurchaseItem, ProductStockMovement, Inventory, ProductVariant}; // Modelos adaptados
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseReceivingService
{
    public function receive(Purchase $purchase, array $itemsToReceive, int $userId): Purchase
    {
        if (!in_array($purchase->status, ['approved', 'partially_received'])) {
            throw new InvalidArgumentException('La compra no está aprobada para recepción.');
        }

        DB::transaction(function () use ($purchase, $itemsToReceive, $userId) {
            $allReceived = true;

            foreach ($purchase->items as $item) {
                $qtyToReceive = (float)($itemsToReceive[$item->id] ?? 0);
                if ($qtyToReceive <= 0) continue;

                $pending = (float)$item->qty_ordered - (float)$item->qty_received;
                if ($qtyToReceive > $pending) {
                    throw new InvalidArgumentException("Cantidad a recibir supera lo pendiente para item #{$item->id}");
                }

                $unitCostFinal = ($item->unit_cost - ($item->discount_amount / max((float)$item->qty_ordered, 1)))
                    + ($item->tax_amount / max((float)$item->qty_ordered, 1))
                    + ($item->landed_cost_alloc / max((float)$item->qty_ordered, 1));

                // CAMBIO: Usamos nuestro modelo de movimientos y referenciamos la variante y la tienda
                ProductStockMovement::create([
                    'product_variant_id' => $item->product_variant_id,
                    'store_id' => $purchase->store_id,
                    'type' => 'purchase_entry',
                    'quantity' => $qtyToReceive,
                    'unit_price' => $unitCostFinal,
                    'subtotal' => $unitCostFinal * $qtyToReceive,
                    'user_id' => $userId,
                    'source_type' => Purchase::class,
                    'source_id' => $purchase->id,
                    'notes' => "Recepción de Compra #{$purchase->code}",
                ]);

                // Actualizar item de compra
                $item->increment('qty_received', $qtyToReceive);

                // --- LÓGICA DE ACTUALIZACIÓN DE STOCK Y COSTOS ADAPTADA ---

                // 1. Aumentamos el stock en nuestra tabla 'inventory'
                $inventory = Inventory::where('store_id', $purchase->store_id)
                    ->where('product_variant_id', $item->product_variant_id)
                    ->lockForUpdate()
                    ->first();

                $stockAnterior = (float) $inventory->quantity;
                $inventory->increment('quantity', $qtyToReceive);

                // 2. Actualizamos los costos en la tabla 'product_variants'
                $variant = $item->productVariant()->lockForUpdate()->first();
                $avgAnterior = (float) $variant->average_cost;

                $nuevoStockTotal = $stockAnterior + $qtyToReceive;
                $avgNuevo = $nuevoStockTotal > 0
                    ? (($stockAnterior * $avgAnterior) + ($qtyToReceive * $unitCostFinal)) / $nuevoStockTotal
                    : $unitCostFinal;

                $variant->update([
                    'last_cost' => $unitCostFinal,
                    'average_cost' => $avgNuevo,
                ]);

                if ((float)$item->qty_received < (float)$item->qty_ordered) {
                    $allReceived = false;
                }
            }

            $purchase->status = $allReceived ? 'received' : 'partially_received';
            $purchase->received_by = $userId;
            $purchase->save();
        });

        return $purchase->fresh(['items']);
    }
}
