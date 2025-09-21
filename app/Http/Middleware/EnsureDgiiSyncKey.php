<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureDgiiSyncKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->query('key');

        if (!$key) {
            return response()->json(['status' => 'idle', 'message' => 'Falta el parámetro key.'], 422);
        }

        // Para status/cancel/download validamos que exista algo en caché
        if (!Cache::has($key) && !Cache::has($key . ':cancel')) {
            return response()->json(['status' => 'idle', 'message' => 'Clave no encontrada o expirada.'], 404);
        }

        return $next($request);
    }
}
