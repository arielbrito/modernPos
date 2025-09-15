<?php

// app/Models/SaleTax.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleTax extends Model
{
    protected $fillable = [
        'sale_id',
        'tax_code',
        'tax_name',
        'tax_rate',
        'taxable_amount',
        'tax_amount'
    ];
}
