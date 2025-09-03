<?php

namespace Tests\Feature\Authorization;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected Role $superAdmin;
    protected Role $manager;
    protected Role $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $guard = config('auth.defaults.guard', 'web');
        $this->superAdmin = Role::firstOrCreate(['name' => 'Super-Admin', 'guard_name' => $guard]);
        $this->manager    = Role::firstOrCreate(['name' => 'Manager',     'guard_name' => $guard]);
        $this->cashier    = Role::firstOrCreate(['name' => 'Cashier',     'guard_name' => $guard]);
    }

    protected function makeStore(array $attr = []): Store
    {
        return Store::create(array_merge([
            'name'      => 'Tienda ' . fake()->unique()->word(),
            'code'      => strtoupper(fake()->unique()->bothify('????')),
            'rnc'       => fake()->numerify('###########'), // 👈 AÑADIDO
            'currency'  => 'DOP',
            'is_active' => true,
        ], $attr));
    }


    protected function makeUser(?Role $role = null): array
    {
        $u = User::create([
            'name'              => fake()->name(),
            'email'             => fake()->unique()->safeEmail(),
            'password'          => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $u->forceFill(['email_verified_at' => now()])->save();

        if ($role) {
            $u->syncRoles($role);
        }

        $store  = $this->makeStore();
        $roleId = ($role ?? $this->cashier)->id; // fallback a Cashier para pivot

        // 👇 pivot con role_id (importante si tu columna NO es nullable)
        $u->stores()->syncWithoutDetaching([$store->id => ['role_id' => $roleId]]);

        return [$u, $store];
    }

    /** index → viewAny */
    public function test_manager_puede_listar_usuarios(): void
    {
        [$mgr, $store] = $this->makeUser($this->manager);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('users.index'))
            ->assertOk();
    }

    public function test_usuario_sin_rol_no_puede_listar_usuarios(): void
    {
        [$u, $store] = $this->makeUser(null);

        $this->actingAs($u)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('users.index'))
            ->assertForbidden();
    }

    /** create → create */
    public function test_cashier_no_puede_ver_crear_usuario(): void
    {
        [$cashier, $store] = $this->makeUser($this->cashier);

        $this->actingAs($cashier)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('users.create'))
            ->assertForbidden();
    }

    public function test_manager_puede_ver_crear_usuario(): void
    {
        [$mgr, $store] = $this->makeUser($this->manager);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('users.create'))
            ->assertOk();
    }

    /** update → update */
    public function test_usuario_puede_actualizarse_a_si_mismo(): void
    {
        [$me, $store] = $this->makeUser(null);

        $this->actingAs($me)
            ->withSession(['active_store_id' => $store->id])
            ->put(route('users.update', $me), [
                'name'                  => 'Nuevo Nombre',
                'email'                 => $me->email, // único
                'password'              => '',         // opcional en update
                'password_confirmation' => '',
                'role_id'               => $this->cashier->id,
                'store_ids'             => [$store->id],
            ])
            ->assertRedirect(route('users.index')); // ajusta a tu redirect real
    }

    public function test_manager_no_puede_actualizar_a_super_admin(): void
    {
        [$admin, $adminStore] = $this->makeUser($this->superAdmin);
        [$mgr,   $mgrStore]   = $this->makeUser($this->manager);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $mgrStore->id])
            ->put(route('users.update', $admin), [
                'name'                  => 'X',
                'email'                 => $admin->email,
                'password'              => '',
                'password_confirmation' => '',
                'role_id'               => $this->manager->id,
                'store_ids'             => [$mgrStore->id],
            ])
            ->assertForbidden();
    }

    /** delete → delete */
    public function test_usuario_no_puede_eliminarse_a_si_mismo(): void
    {
        [$me, $store] = $this->makeUser($this->manager);

        $this->actingAs($me)
            ->withSession(['active_store_id' => $store->id])
            ->delete(route('users.destroy', $me))
            ->assertForbidden();
    }

    public function test_no_se_puede_eliminar_super_admin(): void
    {
        [$admin, $adminStore] = $this->makeUser($this->superAdmin);
        [$mgr,   $mgrStore]   = $this->makeUser($this->manager);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $mgrStore->id])
            ->delete(route('users.destroy', $admin))
            ->assertForbidden();
    }

    public function test_manager_puede_eliminar_usuario_normal(): void
    {
        [$mgr, $mgrStore] = $this->makeUser($this->manager);
        [$usr, $usrStore] = $this->makeUser(null);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $mgrStore->id])
            ->delete(route('users.destroy', $usr))
            ->assertRedirect(route('users.index')); // ajusta a tu redirect real
    }
}
