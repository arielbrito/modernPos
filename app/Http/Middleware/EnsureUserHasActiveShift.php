<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasActiveShift
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. La Lógica Clave: Revisar si ya hay un 'active_shift_id' en la sesión.
        //    Tu HandleInertiaRequests ya se encarga de gestionar este valor.
        $activeShiftId = $request->session()->get('active_shift_id');

        // 2. Si NO hay un ID de turno activo en la sesión, lo redirigimos.
        if (! $activeShiftId) {
            // Guardamos un mensaje flash para dar contexto al usuario.
            return redirect()->route('cash.registers.select') // Asume que esta ruta existe
                ->with('info', 'Por favor, abre un turno para acceder al punto de venta.');
        }

        // 3. Si SÍ hay un turno activo, le permitimos continuar a la ruta solicitada.
        return $next($request);
    }
}
