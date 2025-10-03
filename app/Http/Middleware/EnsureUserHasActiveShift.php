<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\CashShift;

class EnsureUserHasActiveShift
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. La Lógica Clave: Revisar si ya hay un 'active_shift_id' en la sesión.
        //    Tu HandleInertiaRequests ya se encarga de gestionar este valor.
        $activeShiftId = $request->session()->get('active_shift_id');

        // 2. Si NO hay un ID de turno activo en la sesión, lo redirigimos.
        if (!$activeShiftId) {
            // Guardamos un mensaje flash para dar contexto al usuario.
            return redirect()->route('cash.registers.select') // Asume que esta ruta existe
                ->with('info', 'Por favor, abre un turno para acceder al punto de venta.');
        }

        // 2b. Verificación en BD: el turno debe existir y estar OPEN
        $shift = CashShift::query()
            ->select('id', 'status', 'register_id', 'opened_by')
            ->find($activeShiftId);

        if ((int)$shift->opened_by !== (int)$request->user()->id && !$request->user()->can('cash.close.any')) {
            return redirect()->route('cash.registers.select')
                ->with('error', 'Tu sesión no coincide con el turno actual.');
        }

        // 3. Si SÍ hay un turno activo, le permitimos continuar a la ruta solicitada.
        return $next($request);
    }
}
