<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\StoreMovementRequest;
use App\Models\CashShift;
use App\Services\CashRegisterService;
use Illuminate\Http\Request; // <-- Cambiado de Auth a Request

class CashMovementController extends Controller
{
    // Dejamos el servicio solo en el constructor para inyección de dependencias.
    public function __construct(private CashRegisterService $cashRegisterService) {}

    public function store(StoreMovementRequest $request)
    {
        $validated = $request->validated();
        $shiftId = $validated['shift_id'];

        // Laravel ya valida que el shift_id exista y sea de un turno abierto
        // gracias a las reglas en tu StoreMovementRequest (asumiendo que las tienes).
        $shift = CashShift::open()->findOrFail($shiftId);

        $this->authorize('operate', $shift);

        $this->cashRegisterService->movement(
            shiftId: $shift->id,
            userId: $request->user()->id,
            direction: $validated['direction'],
            currency: $validated['currency_code'],
            amount: (float) $validated['amount'],
            reason: $validated['reason'] ?? null,
            reference: $validated['reference'] ?? null,
            meta: ['notes' => $validated['notes'] ?? null]
        );

        return back()->with('success', 'Movimiento registrado exitosamente.');
    }
}
