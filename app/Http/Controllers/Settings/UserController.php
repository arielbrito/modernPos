<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUserRequest;
use App\Http\Requests\Settings\UpdateUserRequest;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class UserController extends Controller
{
    use AuthorizesRequests;
    // public function __construct()
    // {
    //     $this->authorizeResource(\App\Models\User::class, 'user');
    // }
    /**
     * Muestra el listado de usuarios.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);
        // --- Lectura y normalización de filtros ---
        $q         = trim((string) $request->query('q', ''));
        $roleId    = $request->query('role_id');   // int | 'all' | null
        $storeId   = $request->query('store_id');  // int | 'all' | null
        $verified  = $request->query('verified');  // 'yes'|'no'|'all'|1|0|null
        $sort      = $request->query('sort', 'created_at');
        $dir       = strtolower($request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage   = (int) $request->query('per_page', 10);

        $allowedSorts = ['name', 'email', 'created_at'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }
        $perPage = max(5, min($perPage, 100)); // 5–100

        // --- Query base ---
        $query = User::query()
            ->select(['id', 'name', 'email', 'email_verified_at', 'created_at'])
            ->with(['roles:id,name', 'stores:id,name']);

        // Búsqueda
        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        // Filtro por rol (Spatie)
        if ($roleId && $roleId !== 'all') {
            $query->whereHas('roles', fn($r) => $r->where('id', (int) $roleId));
        }

        // Filtro por tienda
        if ($storeId && $storeId !== 'all') {
            $query->whereHas('stores', fn($s) => $s->where('stores.id', (int) $storeId));
        }

        // Filtro por verificación de email
        if ($verified && $verified !== 'all') {
            $v = strtolower((string) $verified);
            if (in_array($v, ['1', 'true', 'yes', 'si', 'sí'], true)) {
                $query->whereNotNull('email_verified_at');
            } elseif (in_array($v, ['0', 'false', 'no'], true)) {
                $query->whereNull('email_verified_at');
            }
        }

        // Orden y paginación
        $users = $query->orderBy($sort, $dir)
            ->paginate($perPage)
            ->withQueryString();

        // Catálogos para selects
        $roles  = Role::query()->select('id', 'name')->orderBy('name')->get();
        $stores = Store::query()->select('id', 'name')->orderBy('name')->get();

        return Inertia::render('settings/users/index', [
            'users'   => $users,
            'filters' => [
                'q'        => $q,
                'role_id'  => $roleId ?: null,
                'store_id' => $storeId ?: null,
                'verified' => $verified ?: 'all',
                'sort'     => $sort,
                'dir'      => $dir,
                'per_page' => $perPage,
            ],
            'roles'   => $roles,
            'stores'  => $stores,
        ]);
    }

    /**
     * Muestra el formulario para crear un nuevo usuario.
     */
    public function create()
    {
        $this->authorize('create', User::class);
        return Inertia::render('settings/users/create', [
            'roles'  => Role::query()->select('id', 'name')->orderBy('name')->get(),
            'stores' => Store::query()->select('id', 'name')->orderBy('name')->get(),
        ]);
    }


    /**
     * Almacena un nuevo usuario en la base de datos.
     */
    public function store(StoreUserRequest $request)
    {
        $this->authorize('create', User::class);
        $v = $request->validated();
        $guard = config('auth.defaults.guard'); // normalmente 'web'

        DB::transaction(function () use ($v, $guard) {
            $user = User::create([
                'name'     => $v['name'],
                'email'    => $v['email'],
                'password' => Hash::make($v['password']),
            ]);

            // Rol (validado en el FormRequest, pero igual lo resolvemos con guard)
            $role = Role::findById($v['role_id'], $guard);
            if (!$role) {
                throw ValidationException::withMessages(['role_id' => 'Rol no válido.']);
            }
            $user->syncRoles($role);

            // Pivot con rol por tienda (si lo usas)
            $storesToSync = collect($v['store_ids'] ?? [])
                ->mapWithKeys(fn($storeId) => [(int)$storeId => ['role_id' => $role->id]]);
            $user->stores()->sync($storesToSync);
        });

        return to_route('users.index')->with('success', 'Usuario creado correctamente.');
    }

    /**
     * Muestra el formulario para editar un usuario.
     */
    public function edit(User $user)
    {
        $this->authorize('update', $user);
        $user->load([
            'roles:id,name',
            'stores:id,name',
        ]);

        return Inertia::render('settings/users/edit', [
            'user'   => $user,
            'roles'  => Role::query()->select('id', 'name')->orderBy('name')->get(),
            'stores' => Store::query()->select('id', 'name')->orderBy('name')->get(),
        ]);
    }


    public function show(User $user)
    {
        $this->authorize('view', $user);
        $user->load(['roles:id,name', 'stores:id,name']);
        return Inertia::render('settings/users/show', [
            'user' => $user,
        ]);
    }



    /**
     * Actualiza los datos de un usuario en la base de datos.
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $this->authorize('update', $user);
        $v = $request->validated();
        $guard = config('auth.defaults.guard');

        // (Opcional) si no permites que el propio Super-Admin se degrade:
        if ($user->id === Auth::id() && $user->hasRole('Super-Admin') && (int)$v['role_id'] !== Role::findByName('Super-Admin', $guard)->id) {
            return back()->with('error', 'No puedes quitarte el rol Super-Admin a ti mismo.');
        }

        DB::transaction(function () use ($user, $v, $guard) {
            $user->update([
                'name'  => $v['name'],
                'email' => $v['email'],
            ]);

            if (!empty($v['password'])) {
                $user->update(['password' => Hash::make($v['password'])]);
            }

            $role = Role::findById($v['role_id'], $guard);
            if (!$role) {
                throw ValidationException::withMessages(['role_id' => 'Rol no válido.']);
            }
            $user->syncRoles($role);

            $storesToSync = collect($v['store_ids'] ?? [])
                ->mapWithKeys(fn($storeId) => [(int)$storeId => ['role_id' => $role->id]]);
            $user->stores()->sync($storesToSync);
        });

        return to_route('users.index')->with('success', 'Usuario actualizado correctamente.');
    }


    /**
     * Elimina un usuario.
     */
    public function destroy(User $user)
    {
        $this->authorize('delete', $user);
        if ($user->hasRole('Super-Admin') || $user->id === Auth::id()) {
            return back()->with('error', 'No es posible eliminar a este usuario.');
        }

        DB::transaction(function () use ($user) {
            // por si tu FK no tiene cascade:
            $user->stores()->detach();
            $user->syncRoles([]);
            $user->delete();
        });

        return redirect()->route('users.index')->with('success', 'Usuario eliminado.');
    }


    public function resendVerification(Request $request, User $user): RedirectResponse
    {
        // (opcional) autorización: solo admins, etc.
        // $this->authorize('update', $user);

        if ($user->hasVerifiedEmail()) {
            return back()->with('success', 'Este usuario ya está verificado.');
        }

        $user->sendEmailVerificationNotification();

        return back()->with('success', "Se envió un enlace de verificación a {$user->email}.");
    }
}
