<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function source()
    {
        return $this->morphTo(__FUNCTION__, 'source_type', 'source_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
