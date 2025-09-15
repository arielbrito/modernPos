<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    protected $guarded = [];
    // protected $fillable = [
    //     'sale_id',
    //     'method',
    //     'amount',
    //     'currency_code',
    //     'reference',
    //     'meta',
    // ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'tendered_amount'  => 'decimal:2',
        'change_amount'    => 'decimal:2',
        'fx_rate_to_sale'  => 'decimal:8',
        'meta'             => 'array',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
