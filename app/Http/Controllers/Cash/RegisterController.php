<?php

// app/Http/Controllers/Cash/RegisterController.php
namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cash\Register\StoreRegisterRequest;
use App\Http\Requests\Cash\Register\UpdateRegisterRequest;
use App\Models\CashCount;
use App\Models\CashDenomination;
use App\Models\CashMovement;
use App\Models\CashShift;
use App\Models\Register;
use App\Models\SalePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;

class RegisterController extends Controller
{
    public function index(Request $req)
    {
        $this->authorize('viewAny', Register::class);

        $activeStoreId = (int) $req->session()->get('active_store_id');

        $q = Register::query()
            ->withCount(['shifts as open_shifts_count' => function ($q) {
                $q->where('status', 'open')->whereNull('closed_at');
            }])
            ->when($activeStoreId, fn($q) => $q->where('store_id', $activeStoreId))
            ->orderBy('name');

        return Inertia::render('cash/registers/index', [
            'registers' => $q->paginate(20)->withQueryString(),
        ]);
    }

    public function store(StoreRegisterRequest $req)
    {
        $activeStoreId = (int) $req->session()->get('active_store_id');
        if (!$activeStoreId) {
            throw ValidationException::withMessages(['store' => 'No hay tienda activa.']);
        }

        $this->authorize('create', Register::class);

        $data = $req->validated();

        // Nombre único por tienda
        $exists = Register::where('store_id', $activeStoreId)->where('name', $data['name'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => 'Ya existe una caja con ese nombre en esta tienda.']);
        }

        $reg = Register::create([
            'store_id' => $activeStoreId,
            'name'     => $data['name'],
            'active'   => true,
        ]);

        return back()->with('success', 'Caja creada: ' . $reg->name);
    }

    public function update(UpdateRegisterRequest $req, Register $register)
    {
        $this->authorize('update', $register);

        $data = $req->validated();

        // Checar unicidad de nombre por tienda
        $dupe = Register::where('store_id', $register->store_id)
            ->where('name', $data['name'])
            ->where('id', '<>', $register->id)
            ->exists();
        if ($dupe) {
            throw ValidationException::withMessages(['name' => 'Ya existe una caja con ese nombre en esta tienda.']);
        }

        // Si vamos a desactivarla, no permitir si hay turno abierto
        if (array_key_exists('active', $data) && !$data['active']) {
            $hasOpen = $register->shifts()->where('status', 'open')->whereNull('closed_at')->exists();
            if ($hasOpen) {
                throw ValidationException::withMessages(['active' => 'No puedes desactivar una caja con turno abierto.']);
            }
        }

        $register->update($data);

        return back()->with('success', 'Caja actualizada.');
    }

    public function destroy(Register $register)
    {
        $this->authorize('delete', $register);

        // No permitir si tiene turnos (histórico)
        if ($register->shifts()->exists()) {
            throw ValidationException::withMessages(['register' => 'No puedes eliminar una caja que tiene historial de turnos. Desactívala en su lugar.']);
        }

        $register->delete();

        return back()->with('success', 'Caja eliminada.');
    }

    public function toggle(Register $register)
    {
        $this->authorize('toggle', $register);

        if ($register->active) {
            // al desactivar, validar
            $hasOpen = $register->shifts()->where('status', 'open')->whereNull('closed_at')->exists();
            if ($hasOpen) {
                throw ValidationException::withMessages(['active' => 'No puedes desactivar una caja con turno abierto.']);
            }
        }

        $register->update(['active' => ! $register->active]);

        return back()->with('success', 'Estado actualizado.');
    }


    // 3.1) Redirige cashbook usando la caja activa o al selector
    public function cashbookActive()
    {
        $regId = session('active_register_id');
        if (!$regId) {
            return redirect()->route('cash.registers.select');
        }
        return redirect()->route('cash.registers.cashbook.show', ['register' => $regId]);
    }

    // 3.2) Selector de caja (muestra solo cajas de la tienda activa)
    public function select(Request $request)
    {
        $this->authorize('viewAny', Register::class);

        $storeId = (int) session('active_store_id');
        $registers = Register::query()
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('active', true)
            ->withExists(['shifts as has_open_shift' => fn($q) => $q
                ->where('status', 'open')
                ->whereNull('closed_at')])
            ->orderBy('name')
            ->get(['id', 'name', 'store_id', 'active']);

        return Inertia::render('cash/registers/select', [
            'registers' => $registers,
            'activeRegisterId' => session('active_register_id'),
        ]);
    }

    // 3.3) Setear caja activa en sesión (valida tienda, estado y turno)
    public function setActive(Register $register)
    {
        $this->authorize('view', $register);

        $storeId = (int) session('active_store_id');
        if ($storeId && $register->store_id !== $storeId) {
            return back()->with('error', 'La caja no pertenece a la tienda activa.');
        }
        if (!$register->active) {
            return back()->with('error', 'La caja está inactiva.');
        }

        // ¿Hay turno abierto en esa caja?
        $openShift = CashShift::where('register_id', $register->id)
            ->where('status', 'open')
            ->whereNull('closed_at')
            ->first();

        // Opcional: bloquear si el turno abierto no es del usuario (a menos que tenga override)
        $user = Auth::user();
        if ($user && $openShift && $openShift->opened_by !== $user->id && !$user->can('cash.override')) {
            return back()->with('error', 'La caja está en uso por otro usuario.');
        }

        session([
            'active_register_id' => $register->id,
            'active_shift_id'    => $openShift?->id,
        ]);

        return to_route('cash.registers.cashbook.show', $register)
            ->with('success', 'Caja activa cambiada a "' . $register->name . '".');
    }

    // 3.4) Limpiar caja activa
    public function clearActive()
    {
        session()->forget(['active_register_id', 'active_shift_id']);
        return back()->with('success', 'Caja activa limpiada.');
    }


    public function cashbook(Register $register, Request $request)
    {
        $this->authorize('view', $register);

        // 1) Moneda activa
        $ccy = strtoupper((string) $request->query('ccy', 'DOP'));

        // 2) Monedas disponibles
        $currencies = CashDenomination::query()
            ->where('active', true)
            ->pluck('currency_code')
            ->unique()
            ->values();

        if ($currencies->isEmpty()) {
            $currencies = collect(['DOP']);
        }
        if (! $currencies->contains($ccy)) {
            $ccy = $currencies->first();
        }

        // 3) Turno abierto
        $shift = CashShift::query()
            ->where('register_id', $register->id)
            ->where('status', 'open')
            ->with(['openedBy:id,name'])
            ->latest('opened_at')
            ->first();

        // ===== Estimado multi-moneda para modales =====
        $expectedByCurrency = [];
        if ($shift) {
            $openingByCcy = CashCount::where('shift_id', $shift->id)
                ->where('type', 'opening')
                ->selectRaw('currency_code, SUM(total_counted) as t')
                ->groupBy('currency_code')
                ->pluck('t', 'currency_code');

            $insByCcy = CashMovement::where('shift_id', $shift->id)
                ->where('direction', 'in')
                ->selectRaw('currency_code, SUM(amount) as t')
                ->groupBy('currency_code')
                ->pluck('t', 'currency_code');

            $outsByCcy = CashMovement::where('shift_id', $shift->id)
                ->where('direction', 'out')
                ->where(function ($q) {
                    $q->whereNull('reason')->orWhere('reason', '<>', 'change');
                })
                ->selectRaw('currency_code, SUM(amount) as t')
                ->groupBy('currency_code')
                ->pluck('t', 'currency_code');


            $ccys = collect([$openingByCcy, $insByCcy, $outsByCcy])
                ->flatMap(fn($p) => $p->keys())
                ->unique();

            foreach ($ccys as $code) {
                $expectedByCurrency[$code] =
                    (float) ($openingByCcy[$code] ?? 0) +
                    (float) ($insByCcy[$code] ?? 0) -
                    (float) ($outsByCcy[$code] ?? 0);
            }
        }

        // 4) Totales, tablas y agregados por método
        $opening = 0.0;
        $income = 0.0;
        $expense = 0.0;            // incluye change (referencia)
        $expenseVisible = 0.0;     // excluye change (para UI y cierre)
        $incomes = collect();
        $expenses = collect();

        // Agregados por método
        $paymentsAgg       = collect(); // rows agrupados sp.method / sp.currency_code
        $cashInActiveCcy   = 0.0;       // efectivo en moneda activa
        $othersInSaleCcy   = 0.0;       // no-efectivo convertido a moneda de la venta
        $payByMethod       = [];        // breakdown en moneda activa {cash: x, card: y,...}
        $incomeNonCash     = 0.0;       // suma no-efectivo en moneda activa (si aplica filtro)

        if ($shift) {
            // --- Pagos agrupados por método/moneda del turno ---
            $paymentsAgg = DB::table('sale_payments as sp')
                ->join('sales as s', 's.id', '=', 'sp.sale_id')
                ->where('s.shift_id', $shift->id)
                ->selectRaw("
                sp.method,
                sp.currency_code,
                COUNT(*)::int as count,
                COALESCE(SUM(sp.amount),0)::numeric(14,2) as amount,
                COALESCE(SUM(
                    CASE
                        WHEN sp.currency_code = s.currency_code
                            THEN sp.amount
                        ELSE sp.amount * COALESCE(sp.fx_rate_to_sale, 0)
                    END
                ),0)::numeric(14,2) as amount_in_sale_ccy
            ")
                ->groupBy('sp.method', 'sp.currency_code')
                ->orderBy('sp.method')
                ->orderBy('sp.currency_code')
                ->get();

            $cashInActiveCcy = (float) $paymentsAgg
                ->where('method', 'cash')
                ->where('currency_code', $ccy)
                ->sum('amount');

            $othersInSaleCcy = (float) $paymentsAgg
                ->reject(fn($r) => $r->method === 'cash')
                ->sum('amount_in_sale_ccy');

            // --- Movimientos de caja (por moneda activa) ---
            $opening = (float) CashCount::query()
                ->where('shift_id', $shift->id)
                ->where('type', 'opening')
                ->where('currency_code', $ccy)
                ->sum('total_counted');

            // Ingresos efectivos (incluye ventas cash + ingresos manuales)
            $income = (float) CashMovement::query()
                ->where('shift_id', $shift->id)
                ->where('direction', 'in')
                ->where('currency_code', $ccy)
                ->sum('amount');

            // Egresos totales (con change) - para referencia
            $expense = (float) CashMovement::query()
                ->where('shift_id', $shift->id)
                ->where('direction', 'out')
                ->where('currency_code', $ccy)
                ->sum('amount');

            // Egresos visibles (excluye devueltas)
            $expenseVisible = (float) CashMovement::query()
                ->where('shift_id', $shift->id)
                ->where('direction', 'out')
                ->where('currency_code', $ccy)
                ->where(function ($q) {
                    $q->whereNull('reason')->orWhere('reason', '!=', 'change');
                })
                ->sum('amount');

            // Tabla de Ingresos enriquecida con método/moneda/número de venta
            $crm = (new CashMovement())->getTable();
            $incomes = CashMovement::query()
                ->from("$crm as crm")
                ->leftJoin('sale_payments as sp', 'sp.id', '=', DB::raw("(crm.meta->>'payment_id')::int"))
                ->leftJoin('sales as s', 's.id', '=', 'sp.sale_id')
                ->where('crm.shift_id', $shift->id)
                ->where('crm.direction', 'in')
                ->where('crm.currency_code', $ccy)
                ->latest('crm.created_at')
                ->limit(300)
                ->get([
                    'crm.id',
                    'crm.created_at',
                    'crm.direction',
                    'crm.amount',
                    'crm.reason',
                    'crm.reference',
                    DB::raw('sp.method as pay_method'),
                    DB::raw('sp.currency_code as pay_currency'),
                    DB::raw('s.number as sale_number'),
                ]);

            // Tabla de Egresos (sin cambio)
            $expenses = CashMovement::query()
                ->where('shift_id', $shift->id)
                ->where('direction', 'out')
                ->where('currency_code', $ccy)
                ->where(function ($q) {
                    $q->whereNull('reason')->orWhere('reason', '!=', 'change');
                })
                ->latest('created_at')
                ->limit(300)
                ->get(['id', 'created_at', 'direction', 'amount', 'reason', 'reference']);

            // Breakdown por método en moneda activa (para chips)
            $payByMethod = SalePayment::query()
                ->join('sales', 'sale_payments.sale_id', '=', 'sales.id')
                ->where('sales.shift_id', $shift->id)
                ->where('sale_payments.currency_code', $ccy)
                ->selectRaw('sale_payments.method, SUM(sale_payments.amount) as t')
                ->groupBy('sale_payments.method')
                ->pluck('t', 'sale_payments.method')
                ->toArray();

            $incomeNonCash = (float) collect($payByMethod)
                ->filter(fn($v, $k) => $k !== 'cash')
                ->sum();
        }

        // 5) EFECTIVO EN MANO / CIERRE (solo efectivo, sin 'change')
        $cashInHand = $opening + $income - $expenseVisible;
        $closing    = $cashInHand;

        // 6) Denominaciones
        $denoms = CashDenomination::query()
            ->where('active', true)
            ->orderByDesc('value')
            ->get(['id', 'value', 'kind', 'currency_code']);

        return Inertia::render('cash/cashbook/show', [
            'register' => ['id' => $register->id, 'name' => $register->name],

            'shift' => $shift ? [
                'id'            => $shift->id,
                'status'        => $shift->status,
                'opened_at'     => $shift->opened_at,
                'opened_by'     => $shift->openedBy ? ['id' => $shift->openedBy->id, 'name' => $shift->openedBy->name] : null,
                'currency_code' => $ccy,
            ] : null,

            'summary' => [
                'opening'         => round($opening, 2),
                'income'          => round($income, 2),           // efectivo entrado
                'expense'         => round($expense, 2),          // con change (referencia)
                'expense_visible' => round($expenseVisible, 2),   // **para UI** (sin change)
                'cash_in_hand'    => round($cashInHand, 2),       // efectivo real en caja
                'closing'         => round($closing, 2),
            ],

            'incomes'        => $incomes,
            'expenses'       => $expenses,
            'denominations'  => $denoms,
            'currencies'     => $currencies,
            'activeCurrency' => $ccy,

            // Agregados para tarjetas/chips de método de pago
            'flow' => [
                'payments_by_method'      => $paymentsAgg,
                'cash_in_active_currency' => round($cashInActiveCcy, 2),
                'non_cash_in_sale_ccy'    => round($othersInSaleCcy, 2),
            ],
            'income_breakdown' => $payByMethod,            // { cash: 17896.90, card: 1151.00, ... }
            'income_non_cash'  => round($incomeNonCash, 2),

            'expected_by_currency' => $expectedByCurrency,

            'can' => [
                'open'  => Gate::allows('open',  [CashShift::class, $register]),
                'move'  => $shift ? Gate::allows('operate', $shift) : false,
                'close' => $shift ? Gate::allows('close',   $shift) : false,
            ],
        ]);
    }


    public function openShiftForm(Register $register, Request $request)
    {
        // Política: CashShiftPolicy@open(User, Register)
        $this->authorize('open', [\App\Models\CashShift::class, $register]);

        // Opcional: evitar si ya hay turno abierto en esa caja
        $alreadyOpen = CashShift::where('register_id', $register->id)
            ->where('status', 'open')
            ->whereNull('closed_at')
            ->exists();

        if ($alreadyOpen) {
            return redirect()
                ->route('cash.registers.cashbook.show', $register)
                ->with('error', 'Esta caja ya tiene un turno abierto.');
        }

        $denoms = CashDenomination::query()
            ->where('active', true)
            ->orderBy('currency_code')
            ->orderByDesc('kind')   // primero billetes
            ->orderByDesc('value')  // mayor a menor
            ->get(['id', 'value', 'kind', 'currency_code']);

        return Inertia::render('cash/cashbook/open-shift', [
            'register'       => ['id' => $register->id, 'name' => $register->name],
            'denominations'  => $denoms,
            'activeCurrency' => strtoupper($request->query('ccy', 'DOP')),
        ]);
    }

    public function closeShiftForm(CashShift $shift, Request $request)
    {
        $this->authorize('close', $shift);

        if ($shift->status !== 'open') {
            return redirect()
                ->route('cash.registers.cashbook.show', $shift->register_id)
                ->with('error', 'El turno no está abierto.');
        }

        $denoms = CashDenomination::query()
            ->where('active', true)
            ->orderBy('currency_code')
            ->orderByDesc('kind')
            ->orderByDesc('value')
            ->get(['id', 'value', 'kind', 'currency_code']);

        $opening = CashCount::where('shift_id', $shift->id)
            ->where('type', 'opening')
            ->selectRaw('currency_code, SUM(total_counted) t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code');

        $ins = CashMovement::where('shift_id', $shift->id)
            ->where('direction', 'in')
            ->selectRaw('currency_code, SUM(amount) t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code');

        // ⬇️ EXCLUIR reason='change'
        $outs = CashMovement::where('shift_id', $shift->id)
            ->where('direction', 'out')
            ->where(function ($q) {
                $q->whereNull('reason')->orWhere('reason', '<>', 'change');
            })
            ->selectRaw('currency_code, SUM(amount) t')
            ->groupBy('currency_code')
            ->pluck('t', 'currency_code');

        $ccys = collect([$opening, $ins, $outs])
            ->flatMap(fn($p) => $p->keys())
            ->unique()
            ->values();

        $expected = [];
        foreach ($ccys as $ccy) {
            $expected[$ccy] = (float) ($opening[$ccy] ?? 0)
                + (float) ($ins[$ccy] ?? 0)
                - (float) ($outs[$ccy] ?? 0);
        }

        $activeCurrency = strtoupper((string) $request->query('ccy', $ccys->first() ?? 'DOP'));

        return Inertia::render('cash/cashbook/close-shift', [
            'shift'          => [
                'id'          => $shift->id,
                'register_id' => $shift->register_id,
                'opened_at'   => $shift->opened_at,
            ],
            'register'       => [
                'id'   => $shift->register->id,
                'name' => $shift->register->name,
            ],
            'denominations'  => $denoms,
            'expected'       => $expected,
            'activeCurrency' => $activeCurrency,
        ]);
    }
}
