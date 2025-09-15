<?php

// app/Models/CashCount.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashCount extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'shift_id',
        'type',
        'currency_code',
        'total_counted',
        'created_by',
        'note',
    ];
    protected $casts = ['total_counted' => 'decimal:2', 'created_at' => 'datetime'];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashShift::class, 'shift_id');
    }
    public function lines(): HasMany
    {
        return $this->hasMany(CashCountLine::class, 'count_id');
    }
}
