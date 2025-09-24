<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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

    protected $table = 'inventory';


    protected $casts = [
        'quantity' => 'decimal:2',

    ];


    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function variant(): BelongsTo
    {
        // El nombre correcto de la tabla es 'product_variants'
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    // // Accesor útil para alertas (opcionalmente: protected $appends = ['low_stock'];)
    // protected function lowStock(): Attribute
    // {
    //     return Attribute::get(fn() => $this->quantity <= $this->stock_alert_threshold);
    // }

    // Scopes prácticos
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'stock_alert_threshold');
    }

    // public function scopeForStore($query, int $storeId)
    // {
    //     return $query->where('store_id', $storeId);
    // }

    // public function scopeForVariant($query, int $variantId)
    // {
    //     return $query->where('product_variant_id', $variantId);
    // }
}
