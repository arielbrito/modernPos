<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $request->session()->put('active_store_id', $storeId);

        // Redirige a lo que intentaba visitar o al dashboard
        return redirect()->intended(route('dashboard', absolute: false));
    }
}
