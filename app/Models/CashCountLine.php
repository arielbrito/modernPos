<?php

// app/Models/CashCountLine.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashCountLine extends Model
{
    protected $fillable = ['count_id', 'denomination_id', 'quantity', 'subtotal'];
    protected $casts = ['subtotal' => 'decimal:2'];
    public function count(): BelongsTo
    {
        return $this->belongsTo(CashCount::class, 'count_id');
    }
    public function denomination(): BelongsTo
    {
        return $this->belongsTo(CashDenomination::class, 'denomination_id');
    }
}
