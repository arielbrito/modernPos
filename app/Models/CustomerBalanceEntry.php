<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerBalanceEntry extends Model
{
    //
    protected $fillable = [
        'customer_balance_id',
        'entry_date',
        'direction',
        'amount',
        'reason',
        'source',
        'meta'
    ];

    public function balance(): BelongsTo
    {
        return $this->belongsTo(CustomerBalance::class);
    }
}
