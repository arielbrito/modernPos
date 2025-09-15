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

            // Crear conteos de apertura por moneda
            foreach ($openingCounts as $currency => $lines) {
                $total = 0;
                $count = CashCount::create([
                    'shift_id'      => $shift->id,
                    'type'          => 'opening',
                    'currency_code' => $currency,
                    'total_counted' => 0,
                    'created_by'    => $userId,
                    'note'          => null,
                ]);

                foreach ($lines as $row) {
                    $den = CashDenomination::findOrFail($row['denomination_id']);
                    if ($den->currency_code !== $currency) {
                        throw new InvalidArgumentException('Denominación no corresponde a la moneda del conteo.');
                    }
                    $qty = max(0, (int)($row['qty'] ?? 0));
                    if ($qty === 0) continue;

                    $subtotal = (float)$den->value * $qty;
                    $total += $subtotal;

                    CashCountLine::create([
                        'count_id'        => $count->id,
                        'denomination_id' => $den->id,
                        'quantity'        => $qty,
                        'subtotal'        => $subtotal,
                    ]);
                }

                $count->update(['total_counted' => $total]);
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

            // Monedas presentes por apertura y movimientos (para asegurar closing aunque no manden nada)
            $openingByCcy = CashCount::where('shift_id', $shift->id)->where('type', 'opening')
                ->selectRaw('currency_code, SUM(total_counted) t')->groupBy('currency_code')->pluck('t', 'currency_code');

            $insByCcy = CashMovement::where('shift_id', $shift->id)
                ->selectRaw("currency_code, SUM(CASE WHEN direction='in' THEN amount ELSE 0 END) t")
                ->groupBy('currency_code')->pluck('t', 'currency_code');

            $outsByCcy = CashMovement::where('shift_id', $shift->id)
                ->selectRaw("currency_code, SUM(CASE WHEN direction='out' THEN amount ELSE 0 END) t")
                ->groupBy('currency_code')->pluck('t', 'currency_code');

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

            $closingTotals = [];

            foreach ($ccys as $currency) {

                $lines = $closingCounts[$currency] ?? []; // puede estar vacío → total 0

                $total = 0.0;
                $count = CashCount::create([
                    'shift_id'      => $shift->id,
                    'type'          => 'closing',
                    'currency_code' => $currency,
                    'total_counted' => 0,
                    'created_by'    => $userId,
                    'note'          => $note,
                ]);

                foreach ($lines as $row) {
                    $den = CashDenomination::findOrFail((int)$row['denomination_id']);
                    if ($den->currency_code !== $currency) {
                        throw new InvalidArgumentException('Denominación no corresponde a la moneda del conteo.');
                    }
                    $qty = max(0, (int)($row['qty'] ?? 0));
                    if ($qty === 0) continue;

                    $subtotal = (float)$den->value * $qty;
                    $total += $subtotal;

                    CashCountLine::create([
                        'count_id'        => $count->id,
                        'denomination_id' => $den->id,
                        'quantity'        => $qty,
                        'subtotal'        => $subtotal,
                    ]);
                }

                $count->update(['total_counted' => round($total, 2)]);
                $closingTotals[$currency] = round($total, 2);
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
                $counted  = (float)($closingTotals[$ccy] ?? 0);
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
        if (!in_array($direction, ['in', 'out'])) {
            throw new InvalidArgumentException('Dirección inválida.');
        }
        return DB::transaction(function () use ($shiftId, $userId, $direction, $currency, $amount, $reason, $reference, $meta, $source) {
            $shift = CashShift::open()->lockForUpdate()->findOrFail($shiftId);

            $movement = CashMovement::create([
                'shift_id'      => $shift->id,
                'direction'     => $direction,
                'currency_code' => $currency,
                'amount'        => round($amount, 2),
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
