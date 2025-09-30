<?php

// app/Listeners/ProcessSaleStockAndAlerts.php

namespace App\Listeners;

use App\Events\SaleCompleted;
use App\Models\ProductStockMovement;
use App\Models\SystemAlert;
use App\Models\Sale; // Asegúrate de importar las clases

// IMPLEMENTA ShouldQueue
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class ProcessSaleStockAndAlerts implements ShouldQueue // <--- CLAVE
{
    // ...

    public function handle(SaleCompleted $event): void
    {
        $sale = $event->sale;
        $userId = $event->userId;
        $storeId = $sale->store_id;

        foreach ($event->saleLineData as $data) {
            // 1. Crear el movimiento de stock (ProductStockMovement)
            ProductStockMovement::create([
                'product_variant_id' => $data['variant_id'],
                'store_id' => $storeId,
                'type' => 'sale_exit',
                'quantity' => $data['qty'],
                'unit_price' => round($data['cogs_unit'], 4),
                'subtotal' => round($data['cogs_unit'] * $data['qty'], 2),
                'user_id' => $userId,
                'source_type' => Sale::class,
                'source_id' => $sale->id,
                'notes' => "Salida por venta #{$sale->number}",
            ]);

            // 2. Lógica de alerta de stock bajo (SystemAlert::updateOrCreate)
            // (Usando la cantidad que quedó después de la venta)
            if ($data['remaining_qty'] <= $data['reorder_point']) {
                SystemAlert::updateOrCreate(
                    // ... (Tu lógica de updateOrCreate, usando los datos del array $data) ...
                    [
                        'type' => 'low_stock',
                        'severity' => 'warning',
                        'title' => "Stock bajo: {$data['product_name']} ({$data['sku']})",
                        'is_read' => false,
                    ],
                    [
                        'message' => "Tienda #{$storeId} — Cantidad: {$data['remaining_qty']}, Umbral: {$data['reorder_point']}",
                        'meta' => [
                            'store_id' => $storeId,
                            'product_variant_id' => $data['variant_id'],
                            'quantity' => $data['remaining_qty'],
                            'reorder_point' => $data['reorder_point'],
                        ],
                    ]
                );
            }
        }
    }
}
