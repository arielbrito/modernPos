<?php

// app/Models/CashMovement.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CashMovement extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'shift_id',
        'direction',
        'currency_code',
        'amount',
        'reason',
        'reference',
        'created_by',
        'created_at',
        'meta',
        'source_type',
        'source_id'
    ];
    protected $casts = ['amount' => 'decimal:2', 'created_at' => 'datetime', 'meta' => 'array'];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashShift::class);
    }
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
