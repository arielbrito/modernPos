<?php

namespace App\Models;

use App\Policies\PurchasePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Casts\Attribute; // 1. Importar Attribute

#[UsePolicy(PurchasePolicy::class)]
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

    public function scopeReceived($q)
    {
        return $q->where('status', 'received');
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

    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }



    protected function trueBalance(): Attribute
    {
        return Attribute::get(function () {
            // Si la compra no está recibida, su balance "válido" es 0
            if ($this->status !== 'received') {
                return 0.0;
            }

            // Toma la suma precargada si viene en la query, si no, suma on-demand
            $returnsAttr = $this->getAttribute('returns_total'); // null si no fue withSum
            $returns = $returnsAttr !== null
                ? (float) $returnsAttr
                : (float) $this->returns()->sum('total_value');

            $grand = (float) $this->grand_total;
            $paid  = (float) $this->paid_total;

            // Evita negativos
            return max(0, $grand - $paid - $returns);
        });
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(PurchaseEmailLog::class);
    }
}
