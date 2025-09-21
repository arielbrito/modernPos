<?php

namespace App\Http\Controllers\Fiscal;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessDgiiPadron; // <- sin tilde
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DgiiSyncController extends Controller // <- nombre consistente
{
    /**
     * Vista de carga
     */
    public function create()
    {
        return Inertia::render('fiscal/dgiiSync/create');
    }

    /**
     * Inicia el proceso: valida, guarda el archivo y encola el Job
     */
    public function store(Request $request)
    {
        // Límite configurable (MB) para protección temprana
        $maxUploadMb = (int) config('dgii_sync.max_upload_mb', 256);

        $request->validate([
            // Acepta csv/txt y gz (por si viene comprimido)
            'padron_file'    => ['required', 'file', 'mimes:csv,txt,gz', "max:" . ($maxUploadMb * 1024)], // max en KB
            'source_version' => ['nullable', 'string', 'max:100'],
            'padron_date'    => ['nullable', 'date'],
            'limit'          => ['nullable', 'integer', 'min:1'],
            'dry_run'        => ['sometimes', 'boolean'],
            'sync_customers' => ['sometimes', 'boolean'],
        ]);

        // Validación adicional por tamaño (por si cambia php.ini)
        $sizeBytes = (int) $request->file('padron_file')->getSize();
        $sizeMb    = $sizeBytes / 1024 / 1024;
        if ($sizeMb > $maxUploadMb) {
            return back()->withErrors([
                'padron_file' => "El archivo pesa " . number_format($sizeMb, 1) . " MB y excede el límite de {$maxUploadMb} MB.",
            ])->onlyInput('padron_file');
        }

        try {
            // Normaliza nombre y ruta sin tildes/espacios raros
            $originalName = $request->file('padron_file')->getClientOriginalName();
            $safeName     = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
            $ext          = strtolower($request->file('padron_file')->getClientOriginalExtension());
            $fileName     = $safeName . '-' . Str::uuid()->toString() . '.' . $ext;

            // Evita tildes en la carpeta
            $relativePath = $request->file('padron_file')->storeAs('padron-uploads', $fileName);
            $absolutePath = Storage::path($relativePath);

            // Cache key única para la UI
            $cacheKey = 'dgii_sync_status_' . Str::uuid()->toString();

            // Estado inicial para la UI (la vista ya puede empezar a sondear)
            $initialStatus = [
                'status'   => 'pending',
                'message'  => 'Proceso en cola, esperando ser procesado por el worker...',
                'progress' => 0,
                'log'      => [now()->format('H:i:s') . ' - Proceso despachado a la cola.'],
                'stats'    => [
                    'original_name' => $originalName,
                    'stored_path'   => $relativePath,
                    'size_mb'       => number_format($sizeMb, 2),
                    'started_at'    => now()->toISOString(),
                ],
            ];
            Cache::store('database')->put($cacheKey, $initialStatus, now()->addHour()); // 👈

            // Opciones hacia el Job
            $options = [
                'dry_run'        => $request->boolean('dry_run'),
                'sync_customers' => $request->boolean('sync_customers', true),
                'source_version' => $request->input('source_version'),
                'padron_date'    => $request->input('padron_date'),
                'limit'          => $request->integer('limit'),

                // Tunables opcionales (puedes exponerlos en .env/config):
                'tickEvery'      => (int) config('dgii_sync.tick_every', 1000),
                'bufferUpsert'   => (int) config('dgii_sync.buffer_upsert', 1000),
                'commitEvery'    => (int) config('dgii_sync.commit_every', 10000),
            ];

            Log::info("DgiiSync: encolando import. key={$cacheKey}", [
                'path'    => $relativePath,
                'size_mb' => $sizeMb,
                'options' => $options,
            ]);

            ProcessDgiiPadron::dispatch($absolutePath, $options, $cacheKey);

            if ($request->expectsJson()) {
                return response()->json([
                    'ok' => true,
                    'sync_cache_key' => $cacheKey,
                    'message' => 'El proceso ha comenzado en segundo plano.',
                ]);
            }

            return redirect()->back()->with([
                'success'        => 'El proceso ha comenzado en segundo plano.',
                'sync_cache_key' => $cacheKey,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al despachar el job de sincronización DGII', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['error' => 'No se pudo iniciar el proceso de importación. Inténtalo de nuevo.']);
        }
    }

    /**
     * Endpoint polled por el frontend para leer estado.
     * "Toca" el TTL para que no expire mientras hay actividad.
     */
    public function status(Request $request)
    {
        $key = $request->query('key');
        if (!$key) {
            return response()->json(['status' => 'idle', 'message' => 'Falta key'], 422);
        }

        $store = Cache::store('database'); // fuerza el mismo store
        $status = $store->get($key, ['status' => 'idle', 'message' => 'Clave no encontrada...']);
        // “tocar” TTL para que no expire durante el polling
        $store->put($key, $status, now()->addHour());

        Log::info('status payload', ['key' => $key, 'status' => $status['status'] ?? null]);
        return response()->json($status);
    }

    /**
     * (Opcional) Cancelar ejecución en curso
     * POST /admin/dgii-sync/cancel?key=...
     */
    public function cancel(Request $request)
    {
        $key = $request->query('key');
        if (!$key) {
            return response()->json(['ok' => false, 'message' => 'Falta key'], 422);
        }
        Cache::store('database')->put($key . ':cancel', true, now()->addHour());
        return response()->json(['ok' => true]);
    }
    /**
     * (Opcional) Descargar el archivo original (si aún no ha sido borrado por el Job)
     */
    public function downloadOriginal(Request $request)
    {
        $key = $request->query('key');
        if (!$key) abort(422, 'Falta key');

        $meta = Cache::store('database')->get($key . ':meta'); // si guardas meta al encolar
        $path = $meta['path'] ?? null;
        if (!$path || !Storage::disk('local')->exists($path)) {
            abort(404, 'Archivo no disponible');
        }
        return Storage::disk('local')->download($path);
    }
}
