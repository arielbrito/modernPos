<?php

namespace App\Models;

use App\Policies\SaleReturnPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // <-- opcional (si agregas deleted_at en la tabla)
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(SaleReturnPolicy::class)]
class SaleReturn extends Model
{
    use HasFactory;
    // use SoftDeletes; // activa si migras deleted_at

    protected $fillable = [
        'sale_id',
        'user_id',
        'currency_code',
        'total_refund',
        'cost_refund',
        'subtotal_refund',
        'tax_refund',
        'discount_refund',
        'reason',
        'meta',
        'journal_entry_id', // si lo estás guardando
    ];

    /**
     * Mantén la venta “tocada” cuando cambie la devolución (útil para listados y cachés).
     */
    protected $touches = ['sale'];

    /**
     * Casts afinados para evitar sorpresas en cálculos/reportes.
     */
    protected $casts = [
        'total_refund'     => 'decimal:2',
        'cost_refund'      => 'decimal:2',
        'subtotal_refund'  => 'decimal:2',
        'tax_refund'       => 'decimal:2',
        'discount_refund'  => 'decimal:2',
        'meta'             => 'array',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    // -------------------
    // Relaciones
    // -------------------

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SaleReturnLine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    // -------------------
    // Scopes de consulta (para index, KPIs, exports)
    // -------------------

    public function scopeSearch($q, ?string $term)
    {
        $term = trim((string) $term);
        if ($term === '') return $q;

        return $q->whereHas('sale', function ($s) use ($term) {
            $s->where('number', 'ilike', "%{$term}%")
                ->orWhereHas('customer', fn($c) => $c->where('name', 'ilike', "%{$term}%"));
        });
    }

    public function scopeDateRange($q, ?string $from, ?string $to)
    {
        if ($from) $q->whereDate('created_at', '>=', $from);
        if ($to)   $q->whereDate('created_at', '<=', $to);
        return $q;
    }

    public function scopeForStore($q, $storeId)
    {
        if (!$storeId) return $q;
        return $q->whereHas('sale', fn($s) => $s->where('store_id', $storeId));
    }

    // -------------------
    // Helpers de negocio
    // -------------------

    /**
     * Recalcula y guarda totales en base a las líneas.
     * Útil tras inserts/bulk operations.
     */
    public function recalcTotals(bool $save = true): static
    {
        $this->loadMissing('lines');

        $subtotal = (float) $this->lines->sum(fn($l) => (float)($l->subtotal_part ?? 0));
        $tax      = (float) $this->lines->sum(fn($l) => (float)($l->tax_part ?? 0));
        $discount = (float) $this->lines->sum(fn($l) => (float)($l->discount_part ?? 0));
        $total    = (float) $this->lines->sum(fn($l) => (float)$l->refund_amount);

        $this->subtotal_refund = round($subtotal, 2);
        $this->tax_refund      = round($tax, 2);
        $this->discount_refund = round($discount, 2);
        $this->total_refund    = round($total, 2);

        if ($save) $this->save();

        return $this;
    }

    /**
     * Total de unidades devueltas (suma qty de líneas).
     */
    public function getTotalQtyAttribute(): float
    {
        return (float) $this->lines->sum('qty');
    }

    // -------------------
    // Normalizadores / Mutators
    // -------------------

    public function setCurrencyCodeAttribute(?string $value): void
    {
        $this->attributes['currency_code'] = strtoupper($value ?: 'DOP');
    }
}
