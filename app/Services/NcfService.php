<?php

// app/Services/NcfService.php
namespace App\Services;

use App\Models\{NcfSequence, Customer};
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class NcfService
{
    /** Default según documento del cliente */
    public function defaultTypeForCustomer(?Customer $c): string
    {
        return ($c && $c->document_type === 'RNC') ? 'B01' : 'B02';
    }

    /** Sólo lectura (no reserva). Puede cambiar si alguien consume antes. */
    public function preview(int $storeId, string $type): ?string
    {
        $seq = NcfSequence::where([
            'store_id' => $storeId,
            'ncf_type_code' => $type,
            'active' => true,
        ])->first();

        if (!$seq) return null;
        if ($seq->end_number && $seq->next_number > $seq->end_number) return null;

        return $seq->format((int)$seq->next_number);
    }

    /**
     * Reserva y retorna el NCF definitivo.
     * Usa row lock para evitar colisiones concurrentes.
     */
    public function consume(int $storeId, string $type): string
    {
        return DB::transaction(function () use ($storeId, $type) {
            /** @var NcfSequence|null $seq */
            $seq = NcfSequence::where([
                'store_id' => $storeId,
                'ncf_type_code' => $type,
                'active' => true,
            ])->lockForUpdate()->first();

            if (!$seq) throw new InvalidArgumentException('No hay secuencia activa para ese tipo.');
            if ($seq->end_number && $seq->next_number > $seq->end_number) {
                throw new InvalidArgumentException('Secuencia agotada.');
            }

            $number = (int)$seq->next_number;
            $seq->next_number = $number + 1;
            $seq->save();

            return $seq->format($number);
        });
    }
}
