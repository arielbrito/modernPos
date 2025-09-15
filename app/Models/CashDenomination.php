<?php

// app/Models/CashDenomination.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashDenomination extends Model
{
    protected $fillable = ['currency_code', 'value', 'kind', 'active', 'position'];
    protected $casts = ['value' => 'decimal:2'];
}
