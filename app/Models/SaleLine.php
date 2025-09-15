<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleLine extends Model
{
    protected $guarded = [];

    protected $casts = [
        'attributes'       => 'array',   // <- importante para jsonb
        // opcionales, sólo para hidratar/serializar bonito:
        'qty'              => 'decimal:3',
        'unit_price'       => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'discount_amount'  => 'decimal:2',
        'tax_rate'         => 'decimal:4',
        'tax_amount'       => 'decimal:2',
        'total_ex_tax'     => 'decimal:2',
        'line_total'       => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /** Total unitario (incluye desc y tax prorrateado) */
    public function getUnitTotalAttribute(): float
    {
        $qty = (float)$this->qty ?: 1;
        return round((float)$this->line_total / $qty, 2);
    }
}
