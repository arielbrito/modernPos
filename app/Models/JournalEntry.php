<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use InvalidArgumentException;
use App\Enums\Accounting\DC;

class JournalEntry extends Model
{
    use HasFactory;

    // Si prefieres "lista blanca", deja $fillable como lo tienes.
    // Con guarded vacía aceptamos mass assignment controlado por Requests/Services.
    protected $guarded = [];

    protected $casts = [
        'entry_date' => 'date',
        'meta'       => 'array',
    ];

    /** Relación con líneas contables */
    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    /** Relación polimórfica al origen (SaleReturn, etc.) */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    /** Normaliza el código de moneda a MAYÚSCULAS (ej. DOP, USD) */
    protected function currencyCode(): Attribute
    {
        return Attribute::make(
            set: fn(?string $v) => $v ? strtoupper($v) : null
        );
    }

    // -----------------------
    // Scopes de consulta
    // -----------------------

    public function scopeOfType($q, ?string $type)
    {
        return $type ? $q->where('type', $type) : $q;
    }

    public function scopeDateRange($q, ?string $from, ?string $to)
    {
        if ($from) $q->whereDate('entry_date', '>=', $from);
        if ($to)   $q->whereDate('entry_date', '<=', $to);
        return $q;
    }

    public function scopeForSource($q, string $class, int $id)
    {
        return $q->where('source_type', $class)->where('source_id', $id);
    }

    // -----------------------
    // Helpers contables
    // -----------------------

    /** Suma de débitos (D) */
    public function totalDebits(): float
    {
        return (float) $this->lines->where('dc', 'D')->sum('amount');
    }

    /** Suma de haberes (C) */
    public function totalCredits(): float
    {
        return (float) $this->lines->where('dc', 'C')->sum('amount');
    }

    /** Diferencia (Debe - Haber) */
    public function balanceDiff(): float
    {
        return round($this->totalDebits() - $this->totalCredits(), 2);
    }

    /** ¿El asiento está cuadrado? */
    public function isBalanced(): bool
    {
        return $this->balanceDiff() === 0.00;
    }

    /**
     * Añade una línea al asiento (no guarda el entry).
     * Útil cuando construyes asientos “a mano” (tests/herramientas).
     */
    public function addLine(string $accountCode, DC $dc, float $amount, ?string $memo = null, ?array $meta = null): JournalLine
    {
        $accountCode = strtoupper(trim($accountCode));
        if ($accountCode === '') {
            throw new InvalidArgumentException('account_code requerido.');
        }
        if ($amount <= 0) {
            throw new InvalidArgumentException('amount debe ser > 0.');
        }

        return $this->lines()->create([
            'account_code' => $accountCode,
            'dc'           => $dc->value, // 'D' o 'C'
            'amount'       => round($amount, 2),
            'memo'         => $memo,
            'meta'         => $meta ?: null,
        ]);
    }
    /**
     * (Opcional) Garantiza balance antes de borrar o publicar, según política.
     * Si quieres forzar que solo se guarden asientos balanceados, descomenta.
     */
    protected static function booted(): void
    {
        // static::saving(function (self $e) {
        //     // Si ya tiene líneas cargadas en memoria, podemos validar.
        //     // En flujos por servicio inserta líneas y valida allí (más flexible).
        //     if ($e->exists && $e->relationLoaded('lines') && !$e->isBalanced()) {
        //         throw new \InvalidArgumentException('El asiento contable no está balanceado.');
        //     }
        // });
    }
}
