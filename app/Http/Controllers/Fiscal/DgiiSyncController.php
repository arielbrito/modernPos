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
        $maxUploadMb = (int) config('dgii_sync.max_upload_mb', 256);

        $request->validate([
            // acepta .csv .txt y .tar.gz (pasa como gz)
            'padron_file'    => ['required', 'file', 'mimes:csv,txt,gz', "max:" . ($maxUploadMb * 1024)],
            'source_version' => ['nullable', 'string', 'max:100'],
            'padron_date'    => ['nullable', 'date'],
            'limit'          => ['nullable', 'integer', 'min:1'],
            'dry_run'        => ['sometimes', 'boolean'],
            'sync_customers' => ['sometimes', 'boolean'],
        ]);

        $file     = $request->file('padron_file');
        $sizeMb   = $file->getSize() / 1024 / 1024;
        if ($sizeMb > $maxUploadMb) {
            return back()->withErrors([
                'padron_file' => "El archivo pesa " . number_format($sizeMb, 1) . " MB y excede {$maxUploadMb} MB."
            ]);
        }

        // ⚠️ Preservar .tar.gz si existe
        $original = $file->getClientOriginalName();                   // p.ej. RNC_Contribuyentes_...tar.gz
        $base     = pathinfo($original, PATHINFO_FILENAME);           // RNC_Contribuyentes_...tar
        $ext      = strtolower($file->getClientOriginalExtension());  // "gz"
        // si termina en ".tar", conserva el sufijo
        $suffix   = str_ends_with($base, '.tar') ? '.tar' : '';
        $safeBase = Str::slug(str_replace('.tar', '', $base));          // slug del nombre sin el .tar
        $fileName = "{$safeBase}{$suffix}-" . Str::uuid() . ".{$ext}";    // ...-uuid.tar.gz  ó ...-uuid.gz

        // 👉 usa disco compartido (configurable)
        $disk = config('filesystems.default');
        $relativePath = Storage::disk($disk)->putFileAs('padron-uploads', $file, $fileName);

        $cacheKey = 'dgii_sync_status_' . Str::uuid();

        Cache::store('database')->put($cacheKey, [
            'status'   => 'pending',
            'message'  => 'Proceso en cola, esperando ser procesado por el worker...',
            'progress' => 0,
            'log'      => [now()->format('H:i:s') . ' - Proceso despachado a la cola.'],
            'stats'    => [
                'original_name' => $original,
                'stored_path'   => $relativePath,
                'size_mb'       => number_format($sizeMb, 2),
                'started_at'    => now()->toISOString(),
            ],
        ], now()->addHour());

        $options = [
            'dry_run'        => $request->boolean('dry_run'),
            'sync_customers' => $request->boolean('sync_customers', true),
            'source_version' => $request->input('source_version'),
            'padron_date'    => $request->input('padron_date'),
            'limit'          => $request->integer('limit'),
            'tickEvery'      => (int) config('dgii_sync.tick_every', 1000),
            'bufferUpsert'   => (int) config('dgii_sync.buffer_upsert', 1000),
            'commitEvery'    => (int) config('dgii_sync.commit_every', 10000),
        ];

        Log::info("DgiiSync: encolando import. key={$cacheKey}", [
            'disk' => $disk,
            'path' => $relativePath,
            'size_mb' => $sizeMb,
            'options' => $options,
        ]);

        // 👇 Pasa DISK + PATH (no una ruta local absoluta)
        ProcessDgiiPadron::dispatch($disk, $relativePath, $options, $cacheKey);

        return redirect()->back()->with([
            'success'        => 'El proceso ha comenzado en segundo plano.',
            'sync_cache_key' => $cacheKey,
        ]);
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

        $meta = Cache::store('database')->get($key . ':meta');
        $disk = $meta['disk'] ?? config('dgii_sync.disk', 's3');
        $path = $meta['path'] ?? null;

        if (!$path || !Storage::disk($disk)->exists($path)) {
            abort(404, 'Archivo no disponible');
        }
        return Storage::disk($disk)->download($path);
    }
}
