<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Models\User;
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
            'auth' => [
                'user' => $request->user(),
                'permissions' => [
                    'user' => [
                        'viewAny' => fn() => $request->user()?->can('viewAny', User::class) ?? false,
                        'create'  => fn() => $request->user()?->can('create',  User::class) ?? false,
                    ],
                    'store' => [
                        'viewAny' => fn() => $request->user()?->can('viewAny', Store::class) ?? false,
                        'create'  => fn() => $request->user()?->can('create',  Store::class) ?? false,
                    ],
                ],
                'stores_active' => fn() => $request->user()
                    ? $request->user()->stores()
                    ->select('stores.id', 'stores.name', 'stores.code', 'stores.logo', 'stores.is_active')
                    ->where('stores.is_active', true)
                    ->orderBy('stores.name')
                    ->get()
                    : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            'flash' => [
                'success' => fn() => Session::get('success'),
                'error' => fn() => Session::get('error'),
            ],

            'active_store' => fn() => $this->buildActiveStore($request),
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
}
