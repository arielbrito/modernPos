<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Register;
use App\Models\CashShift;
use Inertia\Inertia;

class StoreSessionController extends Controller
{
    /** Selección de tienda */
    public function create()
    {
        $stores = Auth::user()
            ->stores()
            ->select('stores.id', 'stores.name', 'stores.logo', 'stores.is_active')
            ->where('stores.is_active', true)
            ->orderBy('stores.name')
            ->get();

        return Inertia::render('auth/selectStore', ['stores' => $stores]);
    }

    /** Guardar selección */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'store_id' => ['required', 'integer', 'exists:stores,id'],
        ]);

        $storeId = (int) $validated['store_id'];

        // Debe pertenecer al usuario y estar activa
        $canAccess = $request->user()
            ->stores()
            ->where('stores.id', $storeId)
            ->where('stores.is_active', true)
            ->exists();

        if (! $canAccess) {
            return back()->withErrors([
                'store_id' => 'No tienes permiso para acceder a esta tienda o está inactiva.',
            ]);
        }

        // Leer tienda previa de la sesión (si la había)
        $previousStoreId = (int) $request->session()->get('active_store_id');

        // Guardar nueva tienda activa
        $request->session()->put('active_store_id', $storeId);

        // Si cambió la tienda, limpiar caja/turno activos
        if ($previousStoreId !== $storeId) {
            $request->session()->forget(['active_register_id', 'active_shift_id']);

            // --------- OPCIONAL: autoseleccionar caja/turno ---------
            // Si la tienda tiene exactamente 1 caja activa, la dejamos lista.
            $onlyRegister = Register::query()
                ->where('store_id', $storeId)
                ->where('active', true)
                ->orderBy('name')
                ->take(2) // performance: no necesitamos contar todo
                ->get(['id', 'name', 'store_id']);

            if ($onlyRegister->count() === 1) {
                $reg = $onlyRegister->first();
                $request->session()->put('active_register_id', $reg->id);

                // Si el usuario ya tiene un turno abierto en esa caja, lo seteamos
                $openShift = CashShift::query()
                    ->where('register_id', $reg->id)
                    ->where('status', 'open')
                    ->whereNull('closed_at')
                    ->where('opened_by', $request->user()->id)
                    ->latest('opened_at')
                    ->first();

                if ($openShift) {
                    $request->session()->put('active_shift_id', $openShift->id);
                }
            }
            // ---------------------------------------------------------
        }

        // Redirige a lo que intentaba visitar o al dashboard
        return redirect()->intended(route('dashboard'));
    }
}
