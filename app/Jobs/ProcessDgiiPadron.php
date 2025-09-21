<?php

namespace App\Jobs;

use App\Services\DgiiSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessDgiiPadron implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $filePath;
    public array $options;
    public string $cacheKey;

    // Config de ejecución
    public int $timeout = 3600; // 1h
    public int $tries   = 2;

    /** @var float|null */
    private ?float $lastStatusUpdateAt = null;

    /** Throttle (segundos) entre writes de estado al cache durante "processing" */
    private float $statusUpdateMinInterval = 1.0;

    public function __construct(string $filePath, array $options, string $cacheKey)
    {
        $this->filePath = $filePath;
        $this->options  = $options;
        $this->cacheKey = $cacheKey;
    }

    /**
     * Backoff progresivo para reintentos (segundos)
     */
    public function backoff(): array
    {
        return [10, 60]; // 10s primer retry, 60s segundo
    }

    /**
     * Tags útiles para monitoreo (Horizon, etc.)
     */
    public function tags(): array
    {
        return ['dgii-sync', "key:{$this->cacheKey}"];
    }

    public function handle(DgiiSyncService $svc): void
    {
        Log::info("DgiiSync: Job iniciado. key={$this->cacheKey} path={$this->filePath}");
        Log::info('job cache driver', ['driver' => cache()->getDefaultDriver()]);

        // Ahorro de memoria para procesos largos
        DB::connection()->disableQueryLog();

        try {
            $startedAt = microtime(true);

            $this->updateStatus('processing', 'Contando total de filas...', 0, [
                'started_at' => now()->toISOString(),
            ], /*force*/ true);

            $totalRows = $svc->countRows($this->filePath);

            if ($totalRows === 0) {
                $this->updateStatus('completed', 'El archivo está vacío o no es válido.', 100, [
                    'processed' => 0,
                    'duration'  => 0,
                    'rate'      => 0,
                ], true);
                return;
            }

            // Opciones avanzadas (con defaults del service)
            $tickEvery    = (int)    ($this->options['tickEvery']    ?? 1000);
            $bufferUpsert = (int)    ($this->options['bufferUpsert'] ?? 1000);
            $commitEvery  = (int)    ($this->options['commitEvery']  ?? 10000);
            $dryRun       = (bool)   ($this->options['dry_run']      ?? false);
            $limit        = (int)    ($this->options['limit']        ?? 0) ?: null;
            $source       = (string) ($this->options['source_version'] ?? '');
            $padronDate   = $this->options['padron_date'] ?? null;

            // Callback de progreso, con ETA y throttle
            $onProgress = function (int $processed, int $total, array $stats) use ($startedAt) {
                $now = microtime(true);
                if ($this->shouldSkipStatusUpdate($now)) {
                    return;
                }
                $this->lastStatusUpdateAt = $now;

                $progress = $total > 0 ? (int) floor(($processed / $total) * 100) : 0;

                $elapsed = $stats['elapsed'] ?? ($now - $startedAt);
                $rate    = $stats['rate']    ?? ($elapsed > 0 ? $processed / $elapsed : 0);
                $eta     = ($rate > 0 && $total > 0) ? (int) max(0, ($total - $processed) / $rate) : null;

                $mergedStats = array_merge($stats, [
                    'processed'   => $processed,
                    'total'       => $total,
                    'eta_seconds' => $eta,
                ]);

                $this->updateStatus('processing', "Procesando fila {$processed} de {$total}...", $progress, $mergedStats);
            };

            // Señal de “en cola / arrancando”
            $this->updateStatus('processing', 'Iniciando importación...', 0, [
                'total'         => $totalRows,
                'tick_every'    => $tickEvery,
                'buffer_upsert' => $bufferUpsert,
                'commit_every'  => $commitEvery,
                'dry_run'       => $dryRun,
            ]);

            // Soporte de cancelación (flag en cache)
            if ($this->isCancelled()) {
                $this->updateStatus('failed', 'Proceso cancelado por el usuario.', 0, ['cancelled' => true], true);
                return;
            }

            $result = $svc->importCsv(
                path: $this->filePath,
                totalRows: $totalRows,
                onProgress: $onProgress,
                tickEvery: $tickEvery,
                limit: $limit,
                dryRun: $dryRun,
                commitEvery: $commitEvery,
                sourceVersion: $source ?: null,
                padronDate: $padronDate,
                bufferUpsert: $bufferUpsert
            );

            // Último update de “processing” (asegura stats finales)
            $onProgress($result['processed'], $totalRows, [
                'elapsed' => $result['duration'],
                'rate'    => $result['rate'],
                'errors'  => $result['errors'] ?? 0,
                'skipped_invalid' => $result['skipped_invalid'] ?? 0,
                'mem_mb'  => round(memory_get_peak_usage(true) / 1024 / 1024, 1),
            ]);

            if (!$dryRun && ($this->options['sync_customers'] ?? false)) {
                $this->updateStatus('finalizing', 'Sincronizando clientes existentes...', 100, $result, true);
                $svc->syncCustomersFromDgii();
            }

            $finalMessage = 'Proceso completado. ' . ($dryRun ? '(Modo Simulación)' : '');
            $this->updateStatus('completed', $finalMessage, 100, array_merge($result, [
                'finished_at' => now()->toISOString(),
            ]), true);
        } catch (\Throwable $e) {
            Log::error('Fallo en el Job de DgiiSync', [
                'key'       => $this->cacheKey,
                'message'   => $e->getMessage(),
                'exception' => $e,
            ]);

            $this->updateStatus('failed', 'Error: ' . $e->getMessage(), 0, [
                'exception' => class_basename($e),
            ], true);

            $this->fail($e);
        } finally {
            // Borra el archivo temporal solo si existe localmente
            try {
                if ($this->isLocalPath($this->filePath)) {
                    Storage::disk('local')->delete($this->filePath);
                }
            } catch (\Throwable $e) {
                Log::warning('No se pudo borrar el archivo temporal', [
                    'key' => $this->cacheKey,
                    'path' => $this->filePath,
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Controla la frecuencia de writes al cache durante "processing"
     */
    private function shouldSkipStatusUpdate(float $now): bool
    {
        if ($this->lastStatusUpdateAt === null) {
            return false;
        }
        return ($now - $this->lastStatusUpdateAt) < $this->statusUpdateMinInterval;
    }

    /**
     * Marcado de estado en caché con merge de stats + log append
     */
    protected function updateStatus(string $status, string $message, ?int $progress = null, ?array $stats = null, bool $force = false): void
    {
        $store = Cache::store('database'); // 👈
        $current = $store->get($this->cacheKey, []);
        $log = $current['log'] ?? [];

        if ($force || $status !== 'processing') {
            $log[] = now()->format('H:i:s') . ' - ' . $message;
        }

        $payload = [
            'status'   => $status,
            'message'  => $message,
            'progress' => $progress ?? ($current['progress'] ?? 0),
            'log'      => $log,
            'stats'    => array_merge($current['stats'] ?? [], $stats ?? []),
        ];

        $store->put($this->cacheKey, $payload, now()->addMinutes(60));
    }

    /**
     * Revisa si el usuario ha marcado cancelación
     */
    private function isCancelled(): bool
    {
        return (bool) Cache::store('database')->get($this->cacheKey . ':cancel', false); // 👈
    }

    /**
     * Determina si es un path local (no S3).
     * Si más adelante usas s3:// o stream wrappers, puedes detectarlo aquí.
     */
    private function isLocalPath(string $path): bool
    {
        // paths generados por Storage::path() típicamente son absolutos locales
        return !str_starts_with($path, 's3://') && !str_starts_with($path, 'gs://');
    }
}
