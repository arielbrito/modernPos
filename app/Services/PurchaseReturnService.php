<?php

// app/Services/PurchaseReturnService.php
namespace App\Services;

use App\Models\{Inventory, ProductStockMovement, Purchase, PurchaseReturn, PurchaseItem};
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseReturnService
{
    public function create(Purchase $purchase, array $data, int $userId): PurchaseReturn
    {
        return DB::transaction(function () use ($purchase, $data, $userId) {
            if (! in_array($purchase->status, ['approved', 'partially_received', 'received'], true)) {
                throw new InvalidArgumentException('La compra no permite devoluciones en su estado actual.');
            }

            $return = $purchase->returns()->create([
                'store_id'    => $purchase->store_id,
                'user_id'     => $userId,
                'status'      => 'completed',
                'notes'       => $data['notes'] ?? null,
                'return_date' => $data['return_date'],
                'total_value' => 0,
                'code'        => 'PENDING',
            ]);
            $return->update(['code' => 'DEV-' . now()->format('Ymd') . '-' . str_pad((string)$return->id, 5, '0', STR_PAD_LEFT)]);

            $totalValue = 0;

            foreach ($data['items'] as $row) {
                /** @var \App\Models\PurchaseItem|null $purchaseItem */
                $purchaseItem = $purchase->items()->lockForUpdate()->find($row['purchase_item_id']);
                if (! $purchaseItem) {
                    throw new InvalidArgumentException("El item #{$row['purchase_item_id']} no pertenece a esta compra.");
                }

                $qty = (float)$row['quantity'];
                $maxReturnable = (float)$purchaseItem->qty_received; // si deseas, resta “ya devuelto” si lo llevas aparte

                if ($qty <= 0 || $qty > $maxReturnable) {
                    throw new InvalidArgumentException("Cantidad inválida para SKU {$purchaseItem->productVariant->sku}.");
                }

                $lineTotal = $qty * (float) $purchaseItem->unit_cost;
                $totalValue += $lineTotal;

                // Item de devolución
                $return->items()->create([
                    'product_variant_id' => $purchaseItem->product_variant_id,
                    'quantity'           => $qty,
                    'unit_cost'          => $purchaseItem->unit_cost,
                    'line_total'         => $lineTotal,
                ]);

                // Inventario
                $inventory = Inventory::where('store_id', $purchase->store_id)
                    ->where('product_variant_id', $purchaseItem->product_variant_id)
                    ->lockForUpdate()
                    ->first();

                if ($inventory) {
                    $inventory->decrement('quantity', $qty);
                }

                // Movimiento (salida por devolución a proveedor)
                ProductStockMovement::create([
                    'product_variant_id' => $purchaseItem->product_variant_id,
                    'store_id'           => $purchase->store_id,
                    'type'               => 'purchase_return_exit',
                    'quantity'           => -$qty,
                    'unit_price'         => $purchaseItem->unit_cost,
                    'subtotal'           => $lineTotal,
                    'user_id'            => $userId,
                    'source_type'        => PurchaseReturn::class,
                    'source_id'          => $return->id,
                    'notes'              => "Devolución de OC {$purchase->code}",
                ]);

                // Reducimos “recibido” si manejas control fino
                $purchaseItem->decrement('qty_received', $qty);
            }

            // Totales y balance de compra
            $return->update(['total_value' => $totalValue]);
            $purchase->decrement('balance_total', $totalValue);

            return $return->fresh(['items.variant.product', 'store', 'user', 'purchase']);
        });
    }
}
