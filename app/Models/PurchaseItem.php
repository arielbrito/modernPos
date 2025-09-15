<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id',
        'product_variant_id',
        'qty_ordered',
        'qty_received',
        'unit_cost',
        'discount_pct',
        'discount_amount',
        'tax_pct',
        'tax_amount',
        'landed_cost_alloc',
        'line_total'
    ];


    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }
}
