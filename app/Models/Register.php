<?php

// app/Models/Register.php
namespace App\Models;

use App\Policies\RegisterPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(RegisterPolicy::class)]
class Register extends Model
{
    protected $fillable = ['store_id', 'name', 'active'];
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
    public function shifts(): HasMany
    {
        return $this->hasMany(CashShift::class);
    }

    public function scopeInStore($q, $storeId)
    {
        return $q->where('store_id', $storeId);
    }

    public function openShift(): ?CashShift
    {
        return $this->shifts()->where('status', 'open')->whereNull('closed_at')->latest('opened_at')->first();
    }
}
