<?php

// tests/Feature/Cash/CashShiftFlowTest.php
use App\Models\{User, Store, Register, CashDenomination, CashShift};
use function Pest\Laravel\{actingAs, get, post};

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->store = Store::factory()->create();
    $this->register = Register::factory()->create([
        'store_id' => $this->store->id,
        'active'   => true,
        'name'     => 'Caja 1',
    ]);

    // Permisos mínimos
    $this->user->givePermissionTo(['cash_shifts.view', 'cash_shifts.open', 'cash_shifts.operate', 'cash_shifts.close']);

    // Sesión: tienda activa
    session(['active_store_id' => $this->store->id]);

    // Denominaciones DOP
    $this->den100 = CashDenomination::factory()->create(['currency_code' => 'DOP', 'value' => 100, 'kind' => 'bill', 'active' => true]);
    $this->den50  = CashDenomination::factory()->create(['currency_code' => 'DOP', 'value' => 50, 'kind' => 'bill', 'active' => true]);

    actingAs($this->user);
});

it('blocks POS without active shift', function () {
    get('/pos')->assertRedirect(route('cash.registers.select'));
});

it('opens shift and grants POS access', function () {
    // open form is GET; we go straight to POST open
    post(route('cash.registers.shift.open', $this->register), [
        'opening' => [
            'DOP' => [
                ['denomination_id' => $this->den100->id, 'qty' => 5],
                ['denomination_id' => $this->den50->id,  'qty' => 2],
            ]
        ],
        'note' => 'Inicio turno',
    ])->assertSessionHasNoErrors();

    // La sesión debe tener active_shift_id
    $shiftId = session('active_shift_id');
    expect($shiftId)->not()->toBeNull();

    get('/pos')->assertOk();
});

it('prevents two open shifts for same register (db constraint)', function () {
    // Primer open
    post(route('cash.registers.shift.open', $this->register), [
        'opening' => ['DOP' => [['denomination_id' => $this->den100->id, 'qty' => 1]]],
    ])->assertSessionHasNoErrors();

    // Segundo intento (misma caja) debe fallar por servicio o constraint
    post(route('cash.registers.shift.open', $this->register), [
        'opening' => ['DOP' => [['denomination_id' => $this->den50->id, 'qty' => 1]]],
    ])->assertSessionHasErrors()->or(fn($r) => $r->assertStatus(500));

    // sanity
    expect(CashShift::open()->where('register_id', $this->register->id)->count())->toBe(1);
});

it('closes shift, clears session, and blocks POS again', function () {
    // abrir
    post(route('cash.registers.shift.open', $this->register), [
        'opening' => ['DOP' => [['denomination_id' => $this->den100->id, 'qty' => 1]]],
    ]);
    $shiftId = session('active_shift_id');
    $shift = CashShift::findOrFail($shiftId);

    // cerrar (sin movimientos; cierre = apertura)
    post(route('cash.shifts.close', $shift), [
        'closing' => [
            'DOP' => [
                ['denomination_id' => $this->den100->id, 'qty' => 1]
            ]
        ],
        'note' => 'Cierre',
    ])->assertSessionHasNoErrors();

    expect(session('active_shift_id'))->toBeNull();
    get('/pos')->assertRedirect(route('cash.registers.select'));
});
