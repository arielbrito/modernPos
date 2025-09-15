<?php

// app/Services/NcfAllocator.php
namespace App\Services;

use App\Models\NcfSequence;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class NcfAllocator
{
    /**
     * Reserva y retorna el próximo NCF para una tienda/tipo.
     * Retorna ['ncf' => 'B02-00000001', 'number' => 1, 'sequence' => NcfSequence]
     */
    public function next(int $storeId, string $ncfTypeCode): array
    {
        return DB::transaction(function () use ($storeId, $ncfTypeCode) {
            /** @var NcfSequence $seq */
            $seq = NcfSequence::where('store_id', $storeId)
                ->where('ncf_type_code', $ncfTypeCode)
                ->where('active', true)
                ->lockForUpdate()
                ->first();

            if (!$seq) {
                throw new RuntimeException("No hay secuencia activa para {$ncfTypeCode} en la tienda {$storeId}");
            }

            $next = $seq->next_number;
            if ($seq->end_number && $next > $seq->end_number) {
                throw new RuntimeException("Secuencia {$ncfTypeCode} agotada en tienda {$storeId}");
            }

            $ncf = $seq->prefix ? "{$seq->prefix}-" . str_pad((string)$next, $seq->pad_length, '0', STR_PAD_LEFT)
                : str_pad((string)$next, $seq->pad_length, '0', STR_PAD_LEFT);

            $seq->increment('next_number');

            return ['ncf' => $ncf, 'number' => $next, 'sequence' => $seq];
        });
    }
}
