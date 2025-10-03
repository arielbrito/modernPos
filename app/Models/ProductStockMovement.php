<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;

class ProductStockMovement extends Model
{
    use HasFactory;
    protected $fillable = [
        'product_variant_id',
        'store_id',
        'type',
        'quantity',
        'unit_price',
        'subtotal',
        'user_id',
        'notes',
        'source_type',
        'source_id',

    ];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_price' => 'decimal:4',
        'subtotal'   => 'decimal:2',
    ];

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
    public function store()
    {
        return $this->belongsTo(Store::class);
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getSignedQuantityAttribute(): float
    {
        $outTypes = ['sale_exit', 'adjustment_out', 'purchase_return_exit'];
        return in_array($this->type, $outTypes, true)
            ? -abs((float)$this->quantity)
            : abs((float)$this->quantity);
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'purchase_entry' => 'Entrada por compra',
            'sale_exit'      => 'Salida por venta',
            'adjustment_in'  => 'Ajuste (+)',
            'adjustment_out' => 'Ajuste (−)',
            'sale_return_entry'    => 'Entrada por devolución de venta',
            'purchase_return_exit' => 'Salida por devolución de compra',
            default          => ucfirst(str_replace('_', ' ', (string) $this->type)),
        };
    }


    // ===== Scopes =====
    public function scopeFor(Builder $q, int $storeId, int $variantId): Builder
    {
        return $q->where('store_id', $storeId)->where('product_variant_id', $variantId);
    }
    public function scopeBetween(Builder $q, $from = null, $to = null): Builder
    {
        return $q->when($from, fn($x) => $x->where('created_at', '>=', $from))
            ->when($to,   fn($x) => $x->where('created_at', '<=', $to));
    }
}
