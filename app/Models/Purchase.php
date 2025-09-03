<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'store_id',
        'code',
        'status',
        'invoice_number',
        'invoice_date',
        'currency',
        'exchange_rate',
        'subtotal',
        'discount_total',
        'tax_total',
        'freight',
        'other_costs',
        'grand_total',
        'paid_total',
        'balance_total',
        'attachments',
        'notes',
        'created_by',
        'approved_by',
        'received_by'
    ];

    protected $casts = [
        'attachments' => 'array',
        'invoice_date' => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }
    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class);
    }

    public function scopeApproved($q)
    {
        return $q->where('status', 'approved');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
