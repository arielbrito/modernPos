<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Models\User;
use App\Models\Register;
use App\Models\CashShift;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => function () use ($request) {
                $user = $request->user();
                if (!$user) return null;

                return [
                    'user' => $user,
                    // 1. Obtenemos TODOS los permisos del usuario de una sola vez.
                    // Esto es mucho más eficiente que hacer múltiples 'can' checks.
                    'permissions' => $user->getAllPermissions()->pluck('name'),

                    // 2. Mantenemos tu lógica de tiendas activas.
                    'stores_active' => $user->stores()
                        // Seleccionamos explícitamente todas las columnas de la tabla 'stores'
                        ->select('stores.*')
                        ->where('is_active', true)
                        ->orderBy('name')
                        ->get(),
                ];
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            'flash' => [
                'success' => fn() => Session::get('success'),
                'error' => fn() => Session::get('error'),
                'sale' => fn() => Session::get('sale'),
            ],
            'pos' => [
                'last_sale' => fn() => $request->session()->pull('pos.last_sale'), // pull = una sola vez
            ],

            'active_store' => fn() => $this->buildActiveStore($request),

            'context' => fn() => $this->buildInertiaContext($request),
        ];
    }



    /**
     * Devuelve la tienda activa como array liviano o null.
     */
    private function buildActiveStore(Request $request): ?array
    {
        // No hay usuario => nada que compartir
        if (! $request->user()) {
            return null;
        }

        // 1) Si el middleware EnsureStoreIsSelected la adjuntó, úsala
        $s = $request->attributes->get('active_store'); // puede ser Store|null

        // 2) Si no estaba adjunta, intentamos con el id en sesión
        if (! $s) {
            $id = $request->session()->get('active_store_id');
            if (! $id) {
                return null;
            }

            // Verificamos pertenencia + obtenemos solo lo necesario
            $s = $request->user()->stores()
                ->select('stores.id', 'stores.name', 'stores.code', 'stores.logo', 'stores.is_active')
                ->where('stores.id', $id)
                ->first();
        }

        if (! $s) {
            return null;
        }

        // Regresa solo lo que el front necesita (incluye accessor logo_url)
        return [
            'id'        => $s->id,
            'name'      => $s->name,
            'code'      => $s->code,
            'logo_url'  => $s->logo_url,   // accessor de tu modelo Store
            'is_active' => (bool) $s->is_active,
        ];
    }



    private function buildInertiaContext(Request $request): array
    {
        $storeId = $request->session()->get('active_store_id');
        $regId   = $request->session()->get('active_register_id');
        $shiftId = $request->session()->get('active_shift_id');

        $activeRegister = null;
        if ($regId) {
            $activeRegister = Register::query()
                ->select('id', 'name', 'store_id')
                ->find($regId);
        }

        // Si quieres mandar también info del turno (opcional):
        $activeShift = $shiftId ? CashShift::query()
            ->select('id', 'opened_at', 'closed_at', 'status', 'register_id', 'opened_by')
            ->find($shiftId) : null;

        return [
            'active_store_id' => $storeId,
            'active_register' => $activeRegister,
            'active_shift_id' => $shiftId,
            // 'active_shift'     => $activeShift, // opcional
        ];
    }
}
