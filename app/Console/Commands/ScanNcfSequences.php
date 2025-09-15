<?php

// app/Console/Commands/ScanNcfSequences.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SystemAlert;
use App\Models\NcfSequence;

class ScanNcfSequences extends Command
{
    protected $signature = 'alerts:scan-ncf {--threshold=10}';
    protected $description = 'Genera alertas cuando las secuencias NCF están por agotarse o faltan';

    public function handle(): int
    {
        $threshold = (int)$this->option('threshold');

        $seqs = NcfSequence::query()->where('is_active', true)->get();
        foreach ($seqs as $s) {
            $remaining = max(0, ($s->end ?? 0) - ($s->current ?? 0));
            if ($remaining <= $threshold) {
                SystemAlert::create([
                    'type' => 'ncf_low',
                    'severity' => $remaining === 0 ? 'critical' : 'warning',
                    'title' => "NCF {$s->type} por agotarse",
                    'message' => "Restantes: {$remaining} (Tienda #{$s->store_id})",
                    'meta' => [
                        'store_id' => $s->store_id,
                        'type' => $s->type,
                        'remaining' => $remaining,
                    ],
                ]);
            }
        }

        // Opcional: alertar si NO hay secuencia activa en alguna tienda
        return self::SUCCESS;
    }
}
