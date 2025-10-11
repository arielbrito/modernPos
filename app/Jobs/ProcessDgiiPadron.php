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
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class ProcessDgiiPadron implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // NUEVO: disco compartido y path relativo
    public string $disk;
    public string $path;
    public array $options;
    public string $cacheKey;

    public int $timeout = 3600;
    public int $tries   = 2;

    private ?float $lastStatusUpdateAt = null;
    private float $statusUpdateMinInterval = 1.0;

    /**
     * @param string $disk  p.ej. "dgii" o "s3"
     * @param string $path  p.ej. "padron-uploads/archivo-uuid.tar.gz"
     */
    public function __construct(string $disk, string $path, array $options, string $cacheKey)
    {
        $this->disk    = $disk;
        $this->path    = $path;
        $this->options = $options;
        $this->cacheKey = $cacheKey;
    }

    public function backoff(): array
    {
        return [10, 60];
    }
    public function tags(): array
    {
        return ['dgii-sync', "key:{$this->cacheKey}"];
    }

    public function handle(DgiiSyncService $svc): void
    {
        Log::info("DgiiSync: Job iniciado.", ['key' => $this->cacheKey, 'disk' => $this->disk, 'path' => $this->path]);
        Log::info('job cache driver', ['driver' => cache()->getDefaultDriver()]);
        DB::connection()->disableQueryLog();

        $tmpWork = null;
        try {
            $startedAt = microtime(true);
            $this->updateStatus('processing', 'Contando total de filas...', 0, [
                'started_at' => now()->toISOString(),
            ], true);

            // === 1) Traer a TMP local del worker ===
            [$tmpWork, $dataPath] = $this->stageToLocalDataPath();

            // === 2) Contar filas del .txt/.csv real ===
            $totalRows = $svc->countRows($dataPath);
            if ($totalRows === 0) {
                $this->updateStatus('completed', 'El archivo está vacío o no es válido.', 100, [
                    'processed' => 0,
                    'duration' => 0,
                    'rate' => 0,
                ], true);
                return;
            }

            $tickEvery    = (int)    ($this->options['tickEvery']    ?? 1000);
            $bufferUpsert = (int)    ($this->options['bufferUpsert'] ?? 1000);
            $commitEvery  = (int)    ($this->options['commitEvery']  ?? 10000);
            $dryRun       = (bool)   ($this->options['dry_run']      ?? false);
            $limit        = (int)    ($this->options['limit']        ?? 0) ?: null;
            $source       = (string) ($this->options['source_version'] ?? '');
            $padronDate   = $this->options['padron_date'] ?? null;

            $onProgress = function (int $processed, int $total, array $stats) use ($startedAt) {
                $now = microtime(true);
                if ($this->shouldSkipStatusUpdate($now)) return;
                $this->lastStatusUpdateAt = $now;

                $progress = $total > 0 ? (int) floor(($processed / $total) * 100) : 0;
                $elapsed  = $stats['elapsed'] ?? ($now - $startedAt);
                $rate     = $stats['rate'] ?? ($elapsed > 0 ? $processed / $elapsed : 0);
                $eta      = ($rate > 0 && $total > 0) ? (int) max(0, ($total - $processed) / $rate) : null;

                $this->updateStatus('processing', "Procesando fila {$processed} de {$total}...", $progress, array_merge($stats, [
                    'processed' => $processed,
                    'total' => $total,
                    'eta_seconds' => $eta,
                ]));
            };

            $this->updateStatus('processing', 'Iniciando importación...', 0, [
                'total' => $totalRows,
                'tick_every' => $tickEvery,
                'buffer_upsert' => $bufferUpsert,
                'commit_every' => $commitEvery,
                'dry_run' => $dryRun,
            ]);

            if ($this->isCancelled()) {
                $this->updateStatus('failed', 'Proceso cancelado por el usuario.', 0, ['cancelled' => true], true);
                return;
            }

            // === 3) Importar usando el path local listo ===
            $result = $svc->importCsv(
                path: $dataPath,
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

            $this->updateStatus('completed', 'Proceso completado.' . ($dryRun ? ' (Modo Simulación)' : ''), 100, array_merge($result, [
                'finished_at' => now()->toISOString(),
            ]), true);
        } catch (\Throwable $e) {
            Log::error('Fallo en el Job de DgiiSync', ['key' => $this->cacheKey, 'message' => $e->getMessage(), 'exception' => $e]);
            $this->updateStatus('failed', 'Error: ' . $e->getMessage(), 0, ['exception' => class_basename($e)], true);
            $this->fail($e);
        } finally {
            if ($tmpWork && is_dir($tmpWork)) {
                try {
                    File::deleteDirectory($tmpWork);
                } catch (\Throwable $e) {
                }
            }
        }
    }

    /** ===== Helpers ===== */

    private function stageToLocalDataPath(): array
    {
        $disk = Storage::disk($this->disk);

        if (!$disk->exists($this->path)) {
            // retrocompatibilidad: si por error vino una ruta absoluta local,
            // inténtala tal cual (solo si existe)
            if (is_file($this->path)) {
                $tmpDir = storage_path('app/dgii-tmp/' . Str::uuid());
                File::ensureDirectoryExists($tmpDir);
                $local = $tmpDir . '/source' . (pathinfo($this->path, PATHINFO_EXTENSION) ? '.' . pathinfo($this->path, PATHINFO_EXTENSION) : '');
                File::copy($this->path, $local);
                return [$tmpDir, $this->unpackIfNeeded($local)];
            }
            throw new \RuntimeException("Archivo no encontrado en disk {$this->disk}: {$this->path}");
        }

        $tmpDir = storage_path('app/dgii-tmp/' . Str::uuid());
        File::ensureDirectoryExists($tmpDir);

        // preserva sufijo .tar si aplica
        $base = pathinfo($this->path, PATHINFO_BASENAME); // nombre.gz o nombre.tar.gz
        $local = $tmpDir . '/' . $base;
        file_put_contents($local, $disk->get($this->path));

        if (filesize($local) === 0) {
            throw new \RuntimeException('Archivo descargado con tamaño 0. Verifica credenciales/permisos del disco.');
        }

        return [$tmpDir, $this->unpackIfNeeded($local)];
    }

    private function unpackIfNeeded(string $localPath): string
    {
        $lower = strtolower($localPath);

        // .tar.gz
        if (str_ends_with($lower, '.tar.gz')) {
            $pharGz = new \PharData($localPath);
            $pharGz->decompress();               // => .../archivo.tar
            $tarPath = substr($localPath, 0, -3); // quita ".gz"
            $pharTar = new \PharData($tarPath);
            $extractDir = dirname($localPath);
            $pharTar->extractTo($extractDir);
            return $this->findTxtOrCsv($extractDir);
        }

        // .gz simple (gzip de un .txt/.csv)
        if (str_ends_with($lower, '.gz')) {
            $out = substr($localPath, 0, -3);
            $gz  = gzopen($localPath, 'rb');
            $fp  = fopen($out, 'wb');
            while (!gzeof($gz)) {
                fwrite($fp, gzread($gz, 8192));
            }
            gzclose($gz);
            fclose($fp);
            return is_file($out) ? $out : $localPath;
        }

        // .csv o .txt directo
        if (str_ends_with($lower, '.csv') || str_ends_with($lower, '.txt')) {
            return $localPath;
        }

        // Tar sin gzip
        if (str_ends_with($lower, '.tar')) {
            $pharTar = new \PharData($localPath);
            $pharTar->extractTo(dirname($localPath));
            return $this->findTxtOrCsv(dirname($localPath));
        }

        // Por defecto, devolver tal cual
        return $localPath;
    }

    private function findTxtOrCsv(string $dir): string
    {
        $file = collect(File::allFiles($dir))->first(function ($f) {
            $n = strtolower($f->getFilename());
            return str_ends_with($n, '.txt') || str_ends_with($n, '.csv');
        });

        if (!$file) {
            throw new \RuntimeException('No se encontró .txt/.csv dentro del paquete.');
        }
        if (filesize($file->getPathname()) === 0) {
            throw new \RuntimeException('El .txt/.csv extraído está vacío.');
        }
        return $file->getPathname();
    }

    private function shouldSkipStatusUpdate(float $now): bool
    {
        if ($this->lastStatusUpdateAt === null) return false;
        return ($now - $this->lastStatusUpdateAt) < $this->statusUpdateMinInterval;
    }

    protected function updateStatus(string $status, string $message, ?int $progress = null, ?array $stats = null, bool $force = false): void
    {
        $store = Cache::store('database');
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
        $store->put($this->cacheKey, $payload, now()->addHour());
    }

    private function isCancelled(): bool
    {
        return (bool) Cache::store('database')->get($this->cacheKey . ':cancel', false);
    }
}
