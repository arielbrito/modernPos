<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'code',
        'name',
        'kind',
        'document_type',
        'document_number',
        'document_number_norm',
        'email',
        'phone',
        'address',
        'is_taxpayer',
        'active',
        'allow_credit',
        'credit_limit',
        'credit_terms_days',
        'balance',
    ];
    protected $casts = [
        'is_taxpayer' => 'bool',
        'active' => 'bool',
        'allow_credit' => 'bool',
        'credit_limit' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::saving(function (Customer $c) {
            // Normaliza doc solo si aplica
            if (in_array($c->document_type, ['RNC', 'CED'])) {
                $c->document_number_norm = $c->document_number
                    ? preg_replace('/\D+/', '', $c->document_number)
                    : null;
            } else {
                $c->document_number_norm = null;
            }
        });
    }


    public function usesCredit(): bool
    {
        return $this->allow_credit && $this->credit_limit > 0;
    }
    public function isPerson(): bool
    {
        return $this->kind === 'person';
    }
    public function isCompany(): bool
    {
        return $this->kind === 'company';
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
