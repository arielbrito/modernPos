<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnLine extends Model
{
    protected $fillable = [
        'sale_return_id',
        'sale_line_id',
        'qty',
        'refund_amount',
        'subtotal_part',   // <- importante para reportes/KPIs
        'tax_part',
        'discount_part',
        'reason',
    ];

    /**
     * Mantén actualizado el updated_at del padre al cambiar líneas.
     */
    protected $touches = ['saleReturn'];

    /**
     * Casts finos para consistencia en cálculos y exportes.
     */
    protected $casts = [
        'qty'            => 'decimal:3',
        'refund_amount'  => 'decimal:2',
        'subtotal_part'  => 'decimal:2',
        'tax_part'       => 'decimal:2',
        'discount_part'  => 'decimal:2',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
    ];

    // Relaciones
    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function saleLine(): BelongsTo
    {
        return $this->belongsTo(SaleLine::class);
    }

    // Scopes útiles para listados/exports
    public function scopeForSale($q, int $saleId)
    {
        return $q->whereHas('saleReturn', fn($r) => $r->where('sale_id', $saleId));
    }

    public function scopeForSaleLine($q, int $saleLineId)
    {
        return $q->where('sale_line_id', $saleLineId);
    }

    /**
     * (Opcional pero recomendado) Blindaje anti sobre-devolución a nivel de modelo.
     * Mantiene coherencia incluso si alguien intenta crear líneas fuera del servicio.
     * Requiere que la venta original esté 'completed' y que exista la columna unique(sale_return_id,sale_line_id).
     */
    protected static function booted(): void
    {
        static::creating(function (self $line) {
            // qty > 0
            if ((float) $line->qty <= 0) {
                throw new \InvalidArgumentException('La cantidad a devolver debe ser mayor que 0.');
            }

            // Validar disponible restante en la línea original
            /** @var \App\Models\SaleLine $orig */
            $orig = \App\Models\SaleLine::query()
                ->select('id', 'qty')
                ->find($line->sale_line_id);

            if (!$orig) {
                throw new \InvalidArgumentException('La línea de venta origen no existe.');
            }

            // Suma de devuelto histórico (todas las devoluciones de la misma venta)
            $already = static::query()
                ->where('sale_line_id', $orig->id)
                ->sum('qty');

            $remaining = max(0, (float)$orig->qty - (float)$already);

            if ((float)$line->qty > $remaining) {
                throw new \InvalidArgumentException("La cantidad a devolver excede el disponible. Restante: {$remaining}");
            }

            // Normalizar importes (si vienen nulos)
            $line->refund_amount  = $line->refund_amount  ?? 0;
            $line->subtotal_part  = $line->subtotal_part  ?? 0;
            $line->tax_part       = $line->tax_part       ?? 0;
            $line->discount_part  = $line->discount_part  ?? 0;
        });

        static::updating(function (self $line) {
            // Evitar que una edición deje negativos o exceda el restante
            if ((float) $line->qty <= 0) {
                throw new \InvalidArgumentException('La cantidad a devolver debe ser mayor que 0.');
            }

            $orig = \App\Models\SaleLine::query()
                ->select('id', 'qty')
                ->find($line->sale_line_id);

            if (!$orig) return;

            // Restar la propia línea (estado anterior) y sumar la nueva
            $already = static::query()
                ->where('sale_line_id', $orig->id)
                ->where('id', '!=', $line->id)
                ->sum('qty');

            $remaining = max(0, (float)$orig->qty - (float)$already);
            if ((float)$line->qty > $remaining) {
                throw new \InvalidArgumentException("La cantidad a devolver excede el disponible. Restante: {$remaining}");
            }
        });
    }
}
