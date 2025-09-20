<?php

namespace App\Jobs;

use App\Services\DgiiSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessDgiiPadrón implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // --- CORRECCIÓN CLAVE ---
    // Declaramos las propiedades públicamente de forma explícita.
    public string $filePath;
    public array $options;
    public string $cacheKey;

    public int $timeout = 3600; // 1 hora
    public int $tries = 1;

    /**
     * Create a new job instance.
     *
     * Usamos un constructor tradicional para asignar las propiedades.
     * Esto es más robusto con el sistema de colas de Laravel.
     */
    public function __construct(string $filePath, array $options, string $cacheKey)
    {
        $this->filePath = $filePath;
        $this->options = $options;
        $this->cacheKey = $cacheKey;
    }

    /**
     * Execute the job.
     */
    public function handle(DgiiSyncService $svc): void
    {
        Log::info("DgiiSync: Job iniciado. Usando Cache Key: " . $this->cacheKey);

        try {
            $this->updateStatus('processing', 'Contando total de filas...', 0);
            $totalRows = $svc->countRows($this->filePath);

            if ($totalRows === 0) {
                $this->updateStatus('completed', 'El archivo está vacío o no es válido.', 100, ['processed' => '0', 'duration' => '0s']);
                return;
            }

            $onProgress = function (int $processed, int $total, array $stats) {
                $progress = $total > 0 ? (int)(($processed / $total) * 100) : 0;
                $this->updateStatus('processing', "Procesando fila {$processed} de {$total}...", $progress, $stats);
            };

            $result = $svc->importCsv(
                path: $this->filePath,
                totalRows: $totalRows,
                onProgress: $onProgress,
                dryRun: $this->options['dry_run'] ?? false,
                sourceVersion: $this->options['source_version'] ?? null,
                padronDate: $this->options['padron_date'] ?? null,
                limit: (int)($this->options['limit'] ?? 0) ?: null
            );

            if ($this->options['sync_customers'] ?? false) {
                $this->updateStatus('finalizing', 'Sincronizando clientes existentes...', 100, $result);
                $svc->syncCustomersFromDgii();
            }

            $finalMessage = 'Proceso completado. ' . ($this->options['dry_run'] ? '(Modo Simulación)' : '');
            $this->updateStatus('completed', $finalMessage, 100, $result);
        } catch (\Throwable $e) {
            Log::error('Fallo en el Job de DgiiSync: ' . $e->getMessage(), ['exception' => $e]);
            $this->updateStatus('failed', 'Error: ' . $e->getMessage(), 0);
            $this->fail($e);
        } finally {
            Storage::disk('local')->delete($this->filePath);
        }
    }

    protected function updateStatus(string $status, string $message, ?int $progress = null, ?array $stats = null): void
    {
        $currentStatus = Cache::get($this->cacheKey, []);
        $log = $currentStatus['log'] ?? [];

        // Añadir al log solo si el mensaje es de un estado final o inicial
        if ($status !== 'processing') {
            $log[] = now()->format('H:i:s') . ' - ' . $message;
        }

        $payload = [
            'status' => $status,
            'message' => $message,
            'progress' => $progress ?? $currentStatus['progress'] ?? 0,
            'log' => $log,
            'stats' => $stats ?? $currentStatus['stats'] ?? [],
        ];

        Cache::put($this->cacheKey, $payload, now()->addMinutes(60));
    }
}
