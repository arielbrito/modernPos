<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class JournalLine extends Model
{
    protected $fillable = [
        'journal_entry_id',
        'account_code',
        'dc',        // 'D' o 'C'
        'amount',
        'memo',
        'meta',
    ];

    protected $casts = [
        'meta'   => 'array',
        'amount' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /** (Opcional) si quieres refrescar updated_at del asiento cuando cambie la línea */
    // protected $touches = ['entry'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    /** Normaliza el código de cuenta en MAYÚSCULAS */
    protected function accountCode(): Attribute
    {
        return Attribute::make(
            set: fn(?string $v) => $v ? strtoupper(trim($v)) : $v
        );
    }

    /** Normaliza y valida el DC (D ó C) al asignar */
    protected function dc(): Attribute
    {
        return Attribute::make(
            set: function (?string $v) {
                if ($v === null) return null;
                $v = strtoupper(trim($v));
                if (!in_array($v, ['D', 'C'], true)) {
                    throw new InvalidArgumentException('dc debe ser "D" o "C".');
                }
                return $v;
            }
        );
    }

    /** Guardrails mínimos a nivel de modelo */
    protected static function booted(): void
    {
        $validate = function (self $line) {
            if (!$line->journal_entry_id) {
                throw new InvalidArgumentException('journal_entry_id es requerido.');
            }
            if (!$line->account_code || $line->account_code === '') {
                throw new InvalidArgumentException('account_code es requerido.');
            }
            if (!in_array($line->dc, ['D', 'C'], true)) {
                throw new InvalidArgumentException('dc debe ser "D" o "C".');
            }
            if ((float)$line->amount <= 0) {
                throw new InvalidArgumentException('amount debe ser > 0.');
            }
        };

        static::creating($validate);
        static::updating($validate);
    }

    /* --- Scopes útiles (opcionales) --- */

    public function scopeDebits($q)
    {
        return $q->where('dc', 'D');
    }
    public function scopeCredits($q)
    {
        return $q->where('dc', 'C');
    }
    public function scopeForAccount($q, string $code)
    {
        return $q->where('account_code', strtoupper($code));
    }
}
