<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class InventoryAdjustment extends Model
{
    use HasFactory;

    protected $fillable = ['store_id', 'user_id', 'code',  'reason', 'notes', 'adjustment_date'];

    protected $casts = ['adjustment_date' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentItem::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function stockMovements(): MorphMany
    {
        return $this->morphMany(ProductStockMovement::class, 'source');
    }
}
