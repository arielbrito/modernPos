<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreIsSelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $storeId = $request->session()->get('active_store_id');

        if (! $storeId) {
            return redirect()->route('store.selector')
                ->with('error', 'Por favor, selecciona una tienda para continuar.');
        }

        $hasAccess = $request->user()
            ->stores()
            ->where('stores.id', $storeId)
            ->where('stores.is_active', true)
            ->exists();

        if (! $hasAccess) {
            $request->session()->forget('active_store_id');
            return redirect()->route('store.selector')
                ->with('error', 'Ya no tienes acceso a la tienda seleccionada. Por favor, elige otra.');
        }

        // Adjunta la tienda al request por si quieres usarla en controladores / Inertia share
        $active = Store::select('id', 'name', 'logo', 'is_active')->find($storeId);
        $request->attributes->set('active_store', $active);

        return $next($request);
    }
}
