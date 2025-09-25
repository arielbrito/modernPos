<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\ProductStockMovement;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseReturnService
{
    public function create(Purchase $purchase, array $data, int $userId): PurchaseReturn
    {
        return DB::transaction(function () use ($purchase, $data, $userId) {
            $totalValue = 0;

            // 1. Crear la cabecera de la devolución
            $return = $purchase->returns()->create([
                'store_id'    => $purchase->store_id,
                'user_id'     => $userId,
                'status'      => 'completed',
                'notes'       => $data['notes'] ?? null,
                'return_date' => $data['return_date'],
                'total_value' => 0, // Se calcula después
                'code'        => 'PENDING',
            ]);
            $return->update(['code' => 'DEV-' . now()->format('Ymd') . '-' . str_pad($return->id, 5, '0', STR_PAD_LEFT)]);

            // 2. Procesar cada ítem devuelto
            foreach ($data['items'] as $itemData) {
                $quantityToReturn = (float) $itemData['quantity'];
                if ($quantityToReturn <= 0) continue;

                $purchaseItem = $purchase->items()->find($itemData['purchase_item_id']);
                if (!$purchaseItem) {
                    throw new InvalidArgumentException("El item {$itemData['purchase_item_id']} no pertenece a esta compra.");
                }

                $maxReturnable = (float) $purchaseItem->qty_received; // Solo se puede devolver lo que se recibió
                if ($quantityToReturn > $maxReturnable) {
                    throw new InvalidArgumentException("La cantidad a devolver para {$purchaseItem->productVariant->sku} excede la cantidad recibida.");
                }

                $lineTotal = $quantityToReturn * (float) $purchaseItem->unit_cost;
                $totalValue += $lineTotal;

                // 3. Crear el registro del item devuelto
                $return->items()->create([
                    'product_variant_id' => $purchaseItem->product_variant_id,
                    'quantity'           => $quantityToReturn,
                    'unit_cost'          => $purchaseItem->unit_cost,
                    'line_total'         => $lineTotal,
                ]);

                // 4. Actualizar el inventario
                $inventory = Inventory::where('store_id', $purchase->store_id)
                    ->where('product_variant_id', $purchaseItem->product_variant_id)
                    ->lockForUpdate()
                    ->first();

                if ($inventory) {
                    $inventory->decrement('quantity', $quantityToReturn);
                }

                // 5. Crear el movimiento de stock para auditoría (¡Importante!)
                // Necesitamos un nuevo tipo de movimiento: 'purchase_return_exit'
                ProductStockMovement::create([
                    'product_variant_id' => $purchaseItem->product_variant_id,
                    'store_id'           => $purchase->store_id,
                    'type'               => 'purchase_return_exit', // Asegúrate de añadir este valor a tu Enum/columna
                    'quantity'           => -$quantityToReturn, // Las salidas son negativas
                    'unit_price'         => $purchaseItem->unit_cost,
                    'subtotal'           => $lineTotal,
                    'user_id'            => $userId,
                    'source_type'        => PurchaseReturn::class,
                    'source_id'          => $return->id,
                ]);
            }

            // 6. Actualizar el total y el balance de la compra original
            $return->update(['total_value' => $totalValue]);
            $purchase->decrement('balance_total', $totalValue); // Esto crea un crédito efectivo

            return $return;
        });
    }
}
