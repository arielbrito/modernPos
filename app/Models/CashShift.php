<?php

// app/Models/CashShift.php
namespace App\Models;

use App\Policies\CashShiftPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(CashShiftPolicy::class)]
class CashShift extends Model
{
    protected $fillable = [
        'register_id',
        'opened_by',
        'closed_by',
        'opened_at',
        'closed_at',
        'status',
        'opening_note',
        'closing_note',
        'meta',
    ];
    protected $casts = ['meta' => 'array', 'opened_at' => 'datetime', 'closed_at' => 'datetime'];

    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
    public function counts(): HasMany
    {
        return $this->hasMany(CashCount::class, 'shift_id');
    }
    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class, 'shift_id');
    }

    public function scopeOpen($q)
    {
        return $q->where('status', 'open')->whereNull('closed_at');
    }
}
