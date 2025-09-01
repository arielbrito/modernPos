<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_variant_id',
        'quantity',
        'stock_alert_threshold',
    ];


    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function productVariant(): BelongsTo
    {
        // El nombre correcto de la tabla es 'product_variants'
        return $this->belongsTo(ProductVariant::class);
    }
}
