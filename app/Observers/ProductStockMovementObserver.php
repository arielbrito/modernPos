<?php

// app/Observers/ProductStockMovementObserver.php
namespace App\Observers;

use App\Models\{Inventory, ProductStockMovement, ProductVariant};
use Illuminate\Support\Facades\DB;

class ProductStockMovementObserver
{
    public function created(ProductStockMovement $m): void
    {
        DB::transaction(function () use ($m) {
            // 1) Actualiza inventario (cache)
            $inv = Inventory::query()->lockForUpdate()
                ->firstOrCreate(
                    ['store_id' => $m->store_id, 'product_variant_id' => $m->product_variant_id],
                    ['quantity' => 0, 'stock_alert_threshold' => 5]
                );

            $delta = match ($m->type) {
                'purchase_entry', 'adjustment_in', 'sale_return_entry'    => (float)$m->quantity,
                'sale_exit', 'adjustment_out', 'purchase_return_exit'     => -(float)$m->quantity,
                default => 0,
            };
            $inv->update(['quantity' => round($inv->quantity + $delta, 2)]);

            // 2) Costos del variant (promedio móvil + last_cost)
            // — Solo tiene sentido con entradas de compra / devolución de compra (disminuye)
            $variant = ProductVariant::query()->lockForUpdate()->find($m->product_variant_id);
            if (!$variant) return;

            if ($m->type === 'purchase_entry') {
                $qtyIn = (float) $m->quantity;
                if ($qtyIn > 0) {
                    $onHandOld = (float) ($inv->quantity - $qtyIn); // estado previo
                    $avgOld    = (float) $variant->average_cost;
                    $unitCost  = (float) $m->unit_price;

                    $avgNew = $onHandOld + $qtyIn > 0
                        ? (($avgOld * $onHandOld) + ($unitCost * $qtyIn)) / ($onHandOld + $qtyIn)
                        : $unitCost;

                    $variant->update([
                        'last_cost'    => round($unitCost, 4),
                        'average_cost' => round($avgNew, 4),
                    ]);
                }
            }

            if ($m->type === 'purchase_return_exit') {
                // Reduce stock y podrías ajustar promedio (opcional).
                // Por simplicidad, mantenemos last_cost y promedio sin cambios.
                // Si quieres recomputar: hacerlo con estrategia definida (FIFO/Weighted).
            }
        });
    }
}
