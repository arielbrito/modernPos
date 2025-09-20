<?php

namespace App\Http\Controllers\Fiscal;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessDgiiPadrón;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DgiiSynController extends Controller
{
    public function create()
    {
        return Inertia::render('fiscal/dgiiSync/create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'padron_file' => ['required', 'file', 'mimes:csv,txt'],
            'source_version' => ['nullable', 'string', 'max:100'],
            'padron_date' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1'],
        ]);

        try {
            $relativePath = $request->file('padron_file')->store('padrón-uploads');
            $absolutePath = Storage::path($relativePath);
            $cacheKey = 'dgii_sync_status_' . Str::uuid()->toString();

            // --- CORRECCIÓN CLAVE ---
            // Ponemos el estado inicial en el caché INMEDIATAMENTE.
            // Así, cuando el frontend pregunte, ya encontrará algo.
            $initialStatus = [
                'status' => 'pending',
                'message' => 'Proceso en cola, esperando ser procesado por el worker...',
                'progress' => 0,
                'log' => [now()->format('H:i:s') . ' - Proceso despachado a la cola.'],
                'stats' => [],
            ];
            Cache::put($cacheKey, $initialStatus, now()->addHour());

            $options = [
                'dry_run' => $request->boolean('dry_run'),
                'sync_customers' => $request->boolean('sync_customers', true),
                'source_version' => $request->input('source_version'),
                'padron_date' => $request->input('padron_date'),
                'limit' => $request->input('limit'),
            ];

            Log::info("Despachando Job DgiiSync. Key: {$cacheKey}. Opciones:", $options);
            ProcessDgiiPadrón::dispatch($absolutePath, $options, $cacheKey);

            return redirect()->back()->with([
                'success' => 'El proceso ha comenzado en segundo plano.',
                'sync_cache_key' => $cacheKey,
            ]);
        } catch (\Exception $e) {
            Log::error('Error al despachar el job de sincronización DGII: ' . $e->getMessage());
            return back()->withErrors(['error' => 'No se pudo iniciar el proceso de importación.']);
        }
    }

    public function status(Request $request)
    {
        $cacheKey = $request->query('key');
        if (!$cacheKey) {
            return response()->json(['status' => 'idle', 'message' => 'Esperando para iniciar...']);
        }

        $status = Cache::get($cacheKey, ['status' => 'idle', 'message' => 'Clave no encontrada...']);
        return response()->json($status);
    }
}
