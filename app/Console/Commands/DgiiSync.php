<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\DgiiSyncService;

class DgiiSync extends Command
{
    protected $signature = 'dgii:sync-taxpayers
        {--file= : Ruta del CSV/TXT}
        {--progress : Muestra progreso}
        {--tick=5000 : Frecuencia de progreso (filas)}
        {--limit= : Máximo de filas (para pruebas)}
        {--dry-run : No escribe en DB}
        {--commit-every=10000 : Commit por lotes}
        {--source-version= : Etiqueta del origen/versión del padrón}
        {--padron-date= : Fecha del padrón YYYY-MM-DD}
        {--sync-customers : Al finalizar, sincroniza flags en customers}
    ';

    protected $description = 'Importa el padrón de RNC/Cédula (DGII) desde un CSV/TXT normalizando y haciendo upsert.';

    public function handle(DgiiSyncService $svc): int
    {
        $file   = $this->option('file') ?? storage_path('app/dgii/padron.csv');
        $tick   = (int)($this->option('tick') ?? 5000);
        $limit  = $this->option('limit') !== null ? (int)$this->option('limit') : null;
        $dry    = (bool)$this->option('dry-run');
        $commit = (int)($this->option('commit-every') ?? 10000);
        $ver    = $this->option('source-version') ?: null;
        $pdate  = $this->option('padron-date') ?: null;
        $syncC  = (bool)$this->option('sync-customers');

        $this->info("Importando: {$file}");
        if ($dry)   $this->warn('DRY-RUN: no se escribirá en la base de datos.');
        if ($limit) $this->line("Límite: {$limit} filas");
        $this->line("Commit cada {$commit} filas. Progreso cada {$tick} filas.");

        $start = microtime(true);

        $onProgress = $this->option('progress') ? function (int $n) use ($start) {
            $elapsed = microtime(true) - $start;
            $rate = $elapsed > 0 ? $n / $elapsed : 0;
            $this->line(sprintf("  > %d filas (%.0f f/s)", $n, $rate));
        } : null;

        $n = $svc->importCsv($file, $onProgress, $tick, $limit, $dry, $commit, $ver, $pdate);

        $elapsed = microtime(true) - $start;
        $rate = $elapsed > 0 ? $n / $elapsed : 0;

        $this->info(($dry ? 'Leídas (DRY)' : 'Importadas/actualizadas') . ": {$n} filas en " . number_format($elapsed, 2) . "s (" . number_format($rate, 0) . " f/s)");

        if ($syncC) {
            $this->line('Sincronizando clientes (customers)…');
            $svc->syncCustomersFromDgii();
            $this->info('Sincronización de customers completada.');
        }

        return self::SUCCESS;
    }
}
