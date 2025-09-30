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

        $regId = session('active_register_id');
        if ($regId) {
            return redirect()->route('cash.registers.cashbook.show', ['register' => $regId]);
        }
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

        $activeCurrency = strtoupper((string) $request->query('ccy', 'DOP'));
        $shift = $register->openShift(); // Usando el helper del modelo Register

        // --- CASO 1: No hay turno abierto ---
        if (!$shift) {
            return Inertia::render('cash/cashbook/show', [
                'register' => $register->only('id', 'name'),
                'shift' => null,
                'summary' => ['opening' => 0, 'income' => 0, 'expense' => 0, 'expense_visible' => 0, 'cash_in_hand' => 0, 'closing' => 0],
                'incomes' => [],
                'expenses' => [],
                'currencies' => CashDenomination::getAvailableCurrencies(), // Usando helper del modelo
                'activeCurrency' => $activeCurrency,
                'flow' => ['payments_by_method' => [], 'cash_in_active_currency' => 0, 'non_cash_in_sale_ccy' => 0],
                'can' => ['open' => Gate::allows('open', [CashShift::class, $register]), 'move' => false, 'close' => false],
            ]);
        }

        // --- CASO 2: Hay un turno abierto ---

        // 1. OBTENER ESTADÍSTICAS PRINCIPALES DE FORMA EFICIENTE
        $stats = DB::table('cash_movements')
            ->where('shift_id', $shift->id)
            ->where('currency_code', $activeCurrency)
            ->selectRaw("
                SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as expense_total,
                SUM(CASE WHEN direction = 'out' AND reason <> 'change' THEN amount ELSE 0 END) as expense_visible
            ")
            ->first();

        $opening = (float) CashCount::where('shift_id', $shift->id)
            ->where('type', 'opening')
            ->where('currency_code', $activeCurrency)
            ->sum('total_counted');

        $income = (float) $stats->income;
        $expenseVisible = (float) $stats->expense_visible;
        $cashInHand = $opening + $income - $expenseVisible;

        // 2. OBTENER DATOS DETALLADOS
        $movements = $shift->movements()
            ->where('currency_code', $activeCurrency)
            ->with('user:id,name', 'source') // Eager loading para optimizar
            ->latest()
            ->get();

        $incomes = $movements->where('direction', 'in')->values();
        $expenses = $movements->where('direction', 'out')->where('reason', '!=', 'change')->values();

        $paymentsAgg = $shift->getPaymentSummary(); // Usando el helper del modelo CashShift
        $cashInActiveCcy = (float) $paymentsAgg->where('method', 'cash')->where('currency_code', $activeCurrency)->sum('amount');
        $othersInSaleCcy = (float) $paymentsAgg->where('method', '!=', 'cash')->sum('amount_in_sale_ccy');

        // 3. ENVIAR RESPUESTA A INERTIA
        return Inertia::render('cash/cashbook/show', [
            'register' => $register->only('id', 'name'),
            'shift' => $shift->only('id', 'status', 'opened_at') + ['opened_by' => $shift->openedBy?->only('id', 'name')],
            'summary' => [
                'opening' => round($opening, 2),
                'income' => round($income, 2),
                'expense' => round((float) $stats->expense_total, 2),
                'expense_visible' => round($expenseVisible, 2),
                'cash_in_hand' => round($cashInHand, 2),
                'closing' => round($cashInHand, 2),
            ],
            'incomes' => $incomes,
            'expenses' => $expenses,
            'denominations' => CashDenomination::where('active', true)->orderByDesc('value')->get(['id', 'value', 'kind', 'currency_code']),
            'currencies' => CashDenomination::getAvailableCurrencies(),
            'activeCurrency' => $activeCurrency,
            'flow' => [
                'payments_by_method' => $paymentsAgg,
                'cash_in_active_currency' => round($cashInActiveCcy, 2),
                'non_cash_in_sale_ccy' => round($othersInSaleCcy, 2),
            ],
            'can' => [
                'open' => Gate::allows('open', [CashShift::class, $register]),
                'move' => Gate::allows('operate', $shift),
                'close' => Gate::allows('close', $shift),
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

        // --- LÓGICA COMPLEJA AHORA EN UNA SOLA LÍNEA ---
        $expected = $shift->getExpectedTotals();

        $denoms = CashDenomination::query()
            ->where('active', true)
            ->orderBy('currency_code')
            ->orderByDesc('value')
            ->get(['id', 'value', 'kind', 'currency_code']);

        $activeCurrency = strtoupper((string) $request->query(
            'ccy',
            $expected->keys()->first() ?? 'DOP'
        ));

        return Inertia::render('cash/cashbook/close-shift', [
            'shift' => $shift->only('id', 'register_id', 'opened_at'),
            'register' => $shift->register->only('id', 'name'),
            'denominations' => $denoms,
            'expected' => $expected,
            'activeCurrency' => $activeCurrency,
        ]);
    }
}
