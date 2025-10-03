<?php

// app/Services/CashRegisterService.php
namespace App\Services;

use App\Models\{CashShift, Register, CashDenomination, CashCount, CashCountLine, CashMovement};
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CashRegisterService
{
    /**
     * $openingCounts: [
     *   'DOP' => [ ['denomination_id'=>1,'qty'=>2], ... ],
     *   'USD' => [ ... ],
     * ]
     */
    public function openShift(Register $register, int $userId, array $openingCounts, ?string $note = null, array $meta = []): CashShift
    {
        return DB::transaction(function () use ($register, $userId, $openingCounts, $note, $meta) {
            // Garantiza única abierta por caja (además del índice parcial)
            if (CashShift::query()->where('register_id', $register->id)->open()->exists()) {
                throw new InvalidArgumentException('Ya existe un turno abierto para esta caja.');
            }

            $shift = CashShift::create([
                'register_id'  => $register->id,
                'opened_by'    => $userId,
                'opened_at'    => now(),
                'status'       => 'open',
                'opening_note' => $note,
                'meta'         => $meta,
            ]);

            // ===== Denominations cache (evita N+1) =====
            $allIds = [];
            foreach ($openingCounts as $ccy => $lines) {
                foreach ((array)$lines as $row) {
                    $id = (int)($row['denomination_id'] ?? 0);
                    if ($id > 0) $allIds[] = $id;
                }
            }
            $denoms = CashDenomination::whereIn('id', array_unique($allIds))
                ->get(['id', 'value', 'currency_code'])
                ->keyBy('id');

            // Crear conteos de apertura por moneda
            foreach ($openingCounts as $currency => $lines) {
                $total = 0;
                $currency = strtoupper((string)$currency);
                $count = CashCount::create([
                    'shift_id'      => $shift->id,
                    'type'          => 'opening',
                    'currency_code' => $currency,
                    'total_counted' => 0,
                    'created_by'    => $userId,
                    'note'          => null,
                ]);

                foreach ($lines as $row) {
                    $denId = (int)($row['denomination_id'] ?? 0);
                    if ($denId <= 0 || !$denoms->has($denId)) {
                        throw new InvalidArgumentException('Denominación inválida en apertura.');
                    }
                    $den = $denoms[$denId];
                    if ($den->currency_code !== $currency) {
                        throw new InvalidArgumentException('Denominación no corresponde a la moneda del conteo.');
                    }
                    $qty = max(0, (int)($row['qty'] ?? 0));
                    if ($qty === 0) continue;

                    $subtotal = bcmul((string)$den->value, (string)$qty, 2);
                    $total = bcadd($total, $subtotal, 2);

                    CashCountLine::create([
                        'count_id'        => $count->id,
                        'denomination_id' => $den->id,
                        'quantity'        => $qty,
                        'subtotal'        => $subtotal,
                    ]);
                }

                $count->update(['total_counted' => (float)$total]);
            }

            return $shift->fresh(['counts.lines']);
        });
    }

    /**
     * $closingCounts: igual estructura que en openShift()
     * Retorna shift con meta['variance'] por moneda.
     */
    // App/Services/CashRegisterService.php

    public function closeShift(CashShift $shift, int $userId, array $closingCounts, ?string $note = null, array $meta = []): CashShift
    {
        return DB::transaction(function () use ($shift, $userId, $closingCounts, $note, $meta) {
            $shift = CashShift::query()->lockForUpdate()->findOrFail($shift->id);
            if ($shift->status !== 'open') {
                throw new InvalidArgumentException('El turno no está abierto.');
            }

            // Si había cierres previos, limpia para no duplicar
            CashCount::where('shift_id', $shift->id)->where('type', 'closing')->delete();

            // Monedas presentes por apertura y movimientos (una sola pasada con COALESCE)
            $openingByCcy = CashCount::where('shift_id', $shift->id)
                ->where('type', 'opening')
                ->selectRaw("currency_code, COALESCE(SUM(total_counted),0) t")
                ->groupBy('currency_code')->pluck('t', 'currency_code');

            $movByCcy = CashMovement::where('shift_id', $shift->id)
                ->selectRaw("currency_code,
                    COALESCE(SUM(CASE WHEN direction='in'  THEN amount ELSE 0 END),0) as ins,
                    COALESCE(SUM(CASE WHEN direction='out' THEN amount ELSE 0 END),0) as outs")
                ->groupBy('currency_code')
                ->get()
                ->keyBy('currency_code');

            $insByCcy  = $movByCcy->map(fn($r) => (float)$r->ins);
            $outsByCcy = $movByCcy->map(fn($r) => (float)$r->outs);

            $keysFromDb = $openingByCcy->keys()
                ->merge($insByCcy->keys())
                ->merge($outsByCcy->keys());

            $keysFromInput = collect($closingCounts)->keys();

            $ccys = $keysFromDb->merge($keysFromInput)
                ->unique()
                ->values()
                ->all();

            // Si igual quedó vacío, asume DOP
            if (empty($ccys)) $ccys = ['DOP'];
            // ===== Denominations cache (evita N+1) =====
            $allIds = [];
            foreach ($closingCounts as $ccy => $lines) {
                foreach ((array)$lines as $row) {
                    $id = (int)($row['denomination_id'] ?? 0);
                    if ($id > 0) $allIds[] = $id;
                }
            }
            $denoms = CashDenomination::whereIn('id', array_unique($allIds))
                ->get(['id', 'value', 'currency_code'])
                ->keyBy('id');

            $closingTotals = [];

            foreach ($ccys as $currency) {

                $lines = $closingCounts[$currency] ?? []; // puede estar vacío → total 0

                $total = '0';
                $currency = strtoupper((string)$currency);
                $count = CashCount::create([
                    'shift_id'      => $shift->id,
                    'type'          => 'closing',
                    'currency_code' => $currency,
                    'total_counted' => 0,
                    'created_by'    => $userId,
                    'note'          => $note,
                ]);

                foreach ($lines as $row) {
                    $denId = (int)($row['denomination_id'] ?? 0);
                    if ($denId <= 0 || !$denoms->has($denId)) {
                        throw new InvalidArgumentException('Denominación inválida en cierre.');
                    }
                    $den = $denoms[$denId];
                    if ($den->currency_code !== $currency) {
                        throw new InvalidArgumentException('Denominación no corresponde a la moneda del conteo.');
                    }
                    $qty = max(0, (int)($row['qty'] ?? 0));
                    if ($qty === 0) continue;

                    $subtotal = bcmul((string)$den->value, (string)$qty, 2);
                    $total = bcadd($total, $subtotal, 2);

                    CashCountLine::create([
                        'count_id'        => $count->id,
                        'denomination_id' => $den->id,
                        'quantity'        => $qty,
                        'subtotal'        => $subtotal,
                    ]);
                }

                $count->update(['total_counted' => (float)$total]);
                $closingTotals[$currency] = (float)$total;
            }

            // === Variance
            $opening = CashCount::where('shift_id', $shift->id)->where('type', 'opening')
                ->get()->groupBy('currency_code')->map->sum('total_counted')->all();

            $ins = CashMovement::where('shift_id', $shift->id)->where('direction', 'in')
                ->get()->groupBy('currency_code')->map->sum('amount')->all();

            $outs = CashMovement::where('shift_id', $shift->id)->where('direction', 'out')
                ->get()->groupBy('currency_code')->map->sum('amount')->all();

            $variance = [];
            $allCcys = array_unique(array_merge(array_keys($opening), array_keys($ins), array_keys($outs), array_keys($closingTotals)));
            foreach ($allCcys as $ccy) {
                $expected = (float)($opening[$ccy] ?? 0) + (float)($ins[$ccy] ?? 0) - (float)($outs[$ccy] ?? 0);
                $counted  = (float)($closingTotals[$ccy] ?? 0);;
                $variance[$ccy] = round($counted - $expected, 2);
            }

            $shift->update([
                'closed_by'    => $userId,
                'closed_at'    => now(),
                'status'       => 'closed',
                'closing_note' => $note,
                'meta'         => array_merge($shift->meta ?? [], $meta, ['variance' => $variance]),
            ]);

            return $shift->fresh(['counts', 'movements']);
        });
    }



    public function movement(int $shiftId, int $userId, string $direction, string $currency, float $amount, ?string $reason = null, ?string $reference = null, array $meta = [], ?object $source = null): CashMovement
    {
        if (!in_array($direction, ['in', 'out'], true)) {
            throw new InvalidArgumentException('Dirección inválida.');
        }
        $currency = strtoupper((string)$currency);
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new InvalidArgumentException('Moneda inválida (use código ISO de 3 letras).');
        }
        if (!is_numeric($amount) || $amount <= 0) {
            throw new InvalidArgumentException('El monto debe ser numérico y mayor a 0.');
        }
        return DB::transaction(function () use ($shiftId, $userId, $direction, $currency, $amount, $reason, $reference, $meta, $source) {
            $shift = CashShift::open()->lockForUpdate()->findOrFail($shiftId);

            $movement = CashMovement::create([
                'shift_id'      => $shift->id,
                'direction'     => $direction,
                'currency_code' => $currency,
                'amount'        => round((float)$amount, 2),
                'reason'        => $reason,
                'reference'     => $reference,
                'created_by'    => $userId,
                'created_at'    => now(),
                'meta'          => $meta,
                'source_type'   => $source ? get_class($source) : null,
                'source_id'     => $source?->id,
            ]);

            return $movement;
        });
    }
}
