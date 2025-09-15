<?php

// app/Http/Controllers/Cash/CashMovementController.php
namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\StoreMovementRequest;
use App\Models\CashShift;
use App\Services\CashRegisterService;
use Illuminate\Support\Facades\Auth;

class CashMovementController extends Controller
{
    public function __construct(private CashRegisterService $svc) {}

    public function store(StoreMovementRequest $req, CashRegisterService $svc)
    {

        // 1) Tomamos el shift_id del body o de la sesión
        $shiftId = $req->input('shift_id') ?? session('active_shift_id');

        if (!$shiftId) {
            abort(409, 'No se pudo determinar el turno.');
        }

        // 2) Debe estar abierto
        $shift = CashShift::open()->find($shiftId);
        if (!$shift) {
            abort(409, 'El turno no está abierto.');
        }

        // 3) (opcional) Asegura misma caja que en sesión
        if (session()->has('active_register_id') && $shift->register_id !== (int)session('active_register_id')) {
            abort(403, 'El turno no pertenece a la caja activa.');
        }

        $this->authorize('operate', $shift);

        $v = $req->validated();

        $svc->movement(
            shiftId: $shift->id,
            userId: $req->user()->id,
            direction: $v['direction'],
            currency: $v['currency_code'],
            amount: (float) $v['amount'],
            reason: $v['reason']    ?? null,
            reference: $v['reference'] ?? null,
            meta: ['notes' => $v['notes'] ?? null],
            source: null,
        );

        return back()->with('success', 'Movimiento registrado.');
    }
}
