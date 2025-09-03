<?php

use App\Models\User;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('redirige al selector si no hay tienda en sesión', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get('/dashboard')
        ->assertRedirect(route('store.selector'));
});

it('permite dashboard con tienda activa', function () {
    $user = User::factory()->create();
    $store = Store::factory()->create(['is_active' => true]);
    $user->stores()->attach($store->id);

    $this->actingAs($user)
        ->withSession(['active_store_id' => $store->id])
        ->get('/dashboard')
        ->assertOk();
});

it('cambia de tienda con permiso', function () {
    $user = User::factory()->create();
    $a = Store::factory()->create(['is_active' => true]);
    $b = Store::factory()->create(['is_active' => true]);
    $user->stores()->attach([$a->id, $b->id]);

    $this->actingAs($user)
        ->post(route('store.switch'), ['store_id' => $b->id])
        ->assertRedirect();

    $this->assertEquals(session('active_store_id'), $b->id);
});
