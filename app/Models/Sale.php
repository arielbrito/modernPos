<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sale extends Model
{
    protected $fillable = [
        'number',
        'store_id',
        'register_id',
        'shift_id',
        'user_id',
        'customer_id',
        'currency_code',
        // <- nuevos
        'bill_to_name',
        'bill_to_doc_type',
        'bill_to_doc_number',
        'bill_to_is_taxpayer',
        //
        'subtotal',
        'discount_total',
        'tax_total',
        'total',
        'paid_total',
        'due_total',
        'ncf_type',
        'ncf_number',
        'occurred_at',
        'meta',
    ];
    protected $casts = [
        'subtotal'       => 'decimal:2',
        'discount_total' => 'decimal:2',
        'tax_total'      => 'decimal:2',
        'total'          => 'decimal:2',
        'paid_total'     => 'decimal:2',
        'due_total'      => 'decimal:2',
        'bill_to_is_taxpayer' => 'boolean',
        'occurred_at'    => 'datetime',
        'meta'           => 'array',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(SaleLine::class);
    }
    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }
    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashShift::class, 'shift_id');
    }
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
