<?php

// app/Models/CashShift.php
namespace App\Models;

use App\Policies\CashShiftPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Support\Collection; // 1. Importar Collection para el type hint
use Illuminate\Support\Facades\DB; // 2. Importar DB
use Illuminate\Database\Eloquent\Builder;


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

    public function scopeOpen(Builder $q): Builder
    {
        return $q->where('status', 'open')->whereNull('closed_at');
    }

    public function getExpectedTotals(): Collection
    {
        // Consulta para los conteos de apertura
        $openings = $this->counts()
            ->where('type', 'opening')
            ->select('currency_code', 'total_counted')
            ->get()
            ->groupBy('currency_code')
            ->map->sum('total_counted');

        // Una sola consulta para todos los movimientos (in y out)
        $movements = $this->movements()
            ->selectRaw("
                currency_code,
                SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
                SUM(CASE WHEN direction = 'out' AND reason <> 'change' THEN amount ELSE 0 END) as total_out
            ")
            ->groupBy('currency_code')
            ->get()
            ->keyBy('currency_code');

        // Unimos todas las monedas involucradas
        $allCurrencies = $openings->keys()->merge($movements->keys())->unique();

        // Calculamos el total esperado para cada moneda
        return $allCurrencies->mapWithKeys(function ($ccy) use ($openings, $movements) {
            $openingAmount = $openings->get($ccy, 0);
            $incomeAmount = $movements->get($ccy)->total_in ?? 0;
            $expenseAmount = $movements->get($ccy)->total_out ?? 0;

            $expected = $openingAmount + $incomeAmount - $expenseAmount;

            return [$ccy => round($expected, 2)];
        });
    }

    public function getPaymentSummary(): Collection
    {
        return DB::table('sale_payments as sp')
            ->join('sales as s', 's.id', '=', 'sp.sale_id')
            ->where('s.shift_id', $this->id) // Usa el ID del turno actual
            ->selectRaw("
                sp.method,
                sp.currency_code,
                COUNT(*)::int as count,
                COALESCE(SUM(sp.amount),0)::numeric(14,2) as amount,
                COALESCE(SUM(
                    CASE
                        WHEN sp.currency_code = s.currency_code
                            THEN sp.amount
                        ELSE sp.amount * COALESCE(sp.fx_rate_to_sale, 0)
                    END
                ),0)::numeric(14,2) as amount_in_sale_ccy
            ")
            ->groupBy('sp.method', 'sp.currency_code')
            ->orderBy('sp.method')
            ->orderBy('sp.currency_code')
            ->get();
    }
}
