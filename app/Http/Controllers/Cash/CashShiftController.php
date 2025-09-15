<?php

// app/Http/Controllers/Cash/CashShiftController.php
namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\OpenShiftRequest;
use App\Http\Requests\Cash\CloseShiftRequest;
use App\Models\{Register, CashShift};
use App\Services\CashRegisterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashShiftController extends Controller
{
    public function __construct(private CashRegisterService $svc) {}

    public function open(OpenShiftRequest $r, Register $register, CashRegisterService $svc)
    {
        $this->authorize('open', [\App\Models\CashShift::class, $register]);

        // Estructura: ['DOP' => [ ['denomination_id'=>..,'qty'=>..], ...], 'USD' => ...]
        $opening = (array) $r->input('opening', []);
        $note    = (string) $r->input('note');

        $shift = $svc->openShift($register, $r->user()->id, $opening, $note);

        // >>> FALTABA ESTO <<<
        $r->session()->put('active_register_id', $register->id);
        $r->session()->put('active_shift_id',    $shift->id);

        return $r->wantsJson()
            ? response()->json(['ok' => true, 'shift_id' => $shift->id], 201)
            : back()->with('success', 'Turno abierto.');
    }

    /** Cerrar turno */
    // App/Http/Controllers/Cash/CashShiftController.php

    public function close(CloseShiftRequest $req, CashShift $shift)
    {
        $this->authorize('close', $shift);
        $data = $req->validated();

        // 1) Acepta varias claves posibles
        $raw = $data['closing'] ?? $data['counts'] ?? $data['closing_counts'] ?? [];

        // 2) Normaliza a: ['DOP' => [['denomination_id'=>int,'qty'=>int], ...], ...]
        $closing = [];
        foreach ($raw as $ccy => $rows) {
            // Puede venir como array plano o como ['lines' => [...]]
            $list = is_array($rows) && array_is_list($rows) ? $rows : ($rows['lines'] ?? []);
            $norm = [];

            foreach ($list as $r) {
                $denId = (int)($r['denomination_id'] ?? $r['denominationId'] ?? $r['id'] ?? 0);
                $qty   = (int)($r['qty'] ?? $r['quantity'] ?? 0);
                if ($denId > 0) {
                    $norm[] = ['denomination_id' => $denId, 'qty' => max(0, $qty)];
                }
            }

            // Aunque no haya líneas, deja la clave de moneda para que se cree el closing con total 0
            $closing[$ccy] = $norm;
        }

        // 3) Si no llegó nada (p. ej. contador vacío), registra al menos la moneda principal en 0
        if (empty($closing)) {
            $primary = $data['active_currency']
                ?? optional($shift->register->store)->currency_code
                ?? 'DOP';
            $closing[$primary] = [];
        }

        app(\App\Services\CashRegisterService::class)->closeShift(
            $shift,
            (int)$req->user()->id,
            $closing,
            $data['note'] ?? null,
            []
        );

        session(['active_shift_id' => null]);

        return to_route('cash.registers.cashbook.show', $shift->register_id)
            ->with('success', 'Turno cerrado.');
    }


    public function current(Request $req)
    {
        $registerId = (int)$req->query('register_id');
        $shift = CashShift::where('register_id', $registerId)->open()->first();

        return response()->json([
            'has_open' => !!$shift,
            'shift'    => $shift?->only(['id', 'register_id', 'opened_at', 'opened_by']),
        ]);
    }
}
