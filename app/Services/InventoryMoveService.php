<?php

// app/Services/InventoryMoveService.php
namespace App\Services;

use App\Models\ProductStockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryMoveService
{
    public function move(int $storeId, int $variantId, string $type, float $qty, float $unitPrice, ?int $userId = null, array $meta = []): ProductStockMovement
    {
        if ($qty <= 0) throw new InvalidArgumentException('Quantity must be > 0');
        if (!in_array($type, ['purchase_entry', 'sale_exit', 'adjustment_in', 'adjustment_out', 'purchase_return_exit', 'sale_return_entry'], true)) {
            throw new InvalidArgumentException('Invalid movement type');
        }

        return DB::transaction(function () use ($storeId, $variantId, $type, $qty, $unitPrice, $userId, $meta) {
            return ProductStockMovement::create([
                'store_id'           => $storeId,
                'product_variant_id' => $variantId,
                'type'               => $type,
                'quantity'           => $qty,
                'unit_price'         => $unitPrice,
                'subtotal'           => round($qty * $unitPrice, 2),
                'user_id'            => $userId,
                'source_type'        => $meta['source_type'] ?? null,
                'source_id'          => $meta['source_id']   ?? null,
                'notes'              => $meta['notes']       ?? null,
            ]);
        });
    }

    // Azúcar semántico
    public function receive(int $storeId, int $variantId, float $qty, float $unitCost, ?int $userId = null, array $meta = [])
    {
        return $this->move($storeId, $variantId, 'purchase_entry', $qty, $unitCost, $userId, $meta);
    }
    public function issueSale(int $storeId, int $variantId, float $qty, float $unitCost = 0, ?int $userId = null, array $meta = [])
    {
        return $this->move($storeId, $variantId, 'sale_exit', $qty, $unitCost, $userId, $meta);
    }
    public function saleReturn(int $storeId, int $variantId, float $qty, float $unitCost = 0, ?int $userId = null, array $meta = [])
    {
        return $this->move($storeId, $variantId, 'sale_return_entry', $qty, $unitCost, $userId, $meta);
    }
    public function purchaseReturn(int $storeId, int $variantId, float $qty, float $unitCost, ?int $userId = null, array $meta = [])
    {
        return $this->move($storeId, $variantId, 'purchase_return_exit', $qty, $unitCost, $userId, $meta);
    }
    public function adjust(int $storeId, int $variantId, float $qty, float $unitCost = 0, ?int $userId = null, array $meta = [])
    {
        $type = $qty >= 0 ? 'adjustment_in' : 'adjustment_out';
        return $this->move($storeId, $variantId, $type, abs($qty), $unitCost, $userId, $meta);
    }
}
