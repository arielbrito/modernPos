<?php

// app/Models/CashDenomination.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashDenomination extends Model
{
    protected $fillable = ['currency_code', 'value', 'kind', 'active', 'position'];
    protected $casts = ['value' => 'decimal:2'];

    public static function getAvailableCurrencies()
    {
        return self::query()->where('active', true)->pluck('currency_code')->unique()->values();
    }
}
