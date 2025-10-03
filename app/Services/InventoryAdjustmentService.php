<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\ProductStockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryAdjustmentService
{
    public function create(array $data, int $storeId, int $userId): InventoryAdjustment
    {
        return DB::transaction(function () use ($data, $storeId, $userId) {

            // CORRECCIÓN: Ya no guardamos el campo 'type'
            $adjustment = InventoryAdjustment::create([
                'store_id'        => $storeId,
                'user_id'         => $userId,
                'reason'          => $data['reason'],
                'notes'           => $data['notes'] ?? null,
                'adjustment_date' => $data['adjustment_date'],
                'code'            => 'PENDING',
            ]);
            $adjustment->update(['code' => 'AJ-' . now()->format('Ymd') . '-' . str_pad($adjustment->id, 5, '0', STR_PAD_LEFT)]);

            foreach ($data['items'] as $itemData) {
                $variantId = $itemData['product_variant_id'];
                $newQuantity = (float) $itemData['new_quantity'];

                $inventory = Inventory::firstOrCreate(
                    ['store_id' => $storeId, 'product_variant_id' => $variantId],
                    ['quantity' => 0]
                );
                $inventory = Inventory::whereKey($inventory->id)->lockForUpdate()->first();

                $previousQuantity = (float) $inventory->quantity;
                $quantityChange = $newQuantity - $previousQuantity;

                if ($quantityChange == 0) continue;

                // CORRECCIÓN: La validación del tipo de ajuste global se elimina.

                // Determinamos el tipo de movimiento dinámicamente.
                $movementType = $quantityChange > 0 ? 'adjustment_in' : 'adjustment_out';


                $adjustment->items()->create([
                    'product_variant_id' => $variantId,
                    'quantity'           => abs($quantityChange),
                    'previous_quantity'  => $previousQuantity,
                    'new_quantity'       => $newQuantity,
                    'cost'               => $inventory->variant->average_cost,
                ]);

                ProductStockMovement::create([
                    'product_variant_id' => $variantId,
                    'store_id'           => $storeId,
                    'type'               => $movementType,
                    'quantity'           => abs($quantityChange),
                    'unit_price'         => $inventory->variant->average_cost,
                    'subtotal'           => abs($quantityChange) * $inventory->variant->average_cost,
                    'user_id'            => $userId,
                    'source_type'        => InventoryAdjustment::class,
                    'source_id'          => $adjustment->id,
                ]);

                $inventory->update(['quantity' => $newQuantity]);
            }

            return $adjustment;
        });
    }
}
