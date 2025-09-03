<?php

namespace Tests\Feature\Authorization;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StorePolicyTest extends TestCase
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

        $active = $this->makeStore();
        $roleId = ($role ?? $this->cashier)->id;

        $u->stores()->syncWithoutDetaching([$active->id => ['role_id' => $roleId]]);


        return [$u, $active];
    }

    /** index → viewAny */
    public function test_cashier_puede_listar_tiendas(): void
    {
        [$cashier, $store] = $this->makeUser($this->cashier);

        $this->actingAs($cashier)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('stores.index'))
            ->assertOk();
    }

    /** view → view */
    public function test_usuario_puede_ver_tienda_asignada(): void
    {
        [$u, $active] = $this->makeUser(null);
        $other        = $this->makeStore();

        // asignamos explícitamente la "other" también
        $u->stores()->syncWithoutDetaching([$other->id => ['role_id' => $this->cashier->id]]);

        $this->actingAs($u)
            ->withSession(['active_store_id' => $active->id])
            ->get(route('stores.show', $other))
            ->assertOk();
    }

    public function test_usuario_no_puede_ver_tienda_no_asignada_si_no_es_manager(): void
    {
        [$u, $active] = $this->makeUser(null);
        $noAsignada   = $this->makeStore();

        $this->actingAs($u)
            ->withSession(['active_store_id' => $active->id])
            ->get(route('stores.show', $noAsignada))
            ->assertForbidden();
    }

    /** create/update/delete */
    public function test_manager_puede_ver_crear_tienda(): void
    {
        [$mgr, $active] = $this->makeUser($this->manager);

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $active->id])
            ->get(route('stores.create'))
            ->assertOk();
    }

    public function test_solo_super_admin_puede_eliminar_tienda(): void
    {
        [$admin, $active] = $this->makeUser($this->superAdmin);
        $victim = $this->makeStore();

        $this->actingAs($admin)
            ->withSession(['active_store_id' => $active->id])
            ->delete(route('stores.destroy', $victim))
            ->assertRedirect(route('stores.index')); // ajusta a tu redirect real
    }

    public function test_manager_no_puede_eliminar_tienda(): void
    {
        [$mgr, $active] = $this->makeUser($this->manager);
        $victim = $this->makeStore();

        $this->actingAs($mgr)
            ->withSession(['active_store_id' => $active->id])
            ->delete(route('stores.destroy', $victim))
            ->assertForbidden();
    }
}
