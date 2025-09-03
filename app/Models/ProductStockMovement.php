<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ProductStockMovement extends Model
{
    use HasFactory;
    protected $fillable = [
        'product_varian_id',
        'store_id',
        'type',
        'quantity',
        'unit_price',
        'subtotal',
        'user_id',
        'notes',
        'source_type',
        'source_id'
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
        return in_array($this->type, ['sale_exit', 'adjustment_out'])
            ? -abs((float) $this->quantity)
            : abs((float) $this->quantity);
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'purchase_entry' => 'Entrada por compra',
            'sale_exit'      => 'Salida por venta',
            'adjustment_in'  => 'Ajuste (+)',
            'adjustment_out' => 'Ajuste (−)',
            default          => ucfirst(str_replace('_', ' ', (string) $this->type)),
        };
    }
}
