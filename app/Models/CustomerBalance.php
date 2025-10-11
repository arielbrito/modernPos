<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerBalance extends Model
{
    //
    protected $fillable = [
        'customer_id',
        'balance'
    ];


    public function balanceEntries(): HasMany
    {
        return $this->hasMany(CustomerBalanceEntry::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
