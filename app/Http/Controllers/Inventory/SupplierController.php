<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreSupplierRequest;
use App\Http\Requests\Inventory\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SupplierController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->get('q', ''));

        $suppliers = Supplier::query()
            // ✅ Se añade el conteo de la relación 'purchases'
            ->withCount('purchases')
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%{$q}%")
                        ->orWhere('rnc', 'like', "%{$q}%")
                        ->orWhere('phone', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->latest()
            ->paginate(20)
            ->appends(['q' => $q]);

        return inertia('inventory/suppliers/index', [
            'supliers' => $suppliers,
            'filters' => ['q' => $q],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSupplierRequest $request)
    {
        $data = $request->validated();
        $supplier = Supplier::create($data);
        return redirect()->route('inventory.suppliers.index')->with('success', 'Proveedor creado.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Supplier $supplier)
    {
        $supplier->loadCount('purchases');

        $open = $supplier->purchases()
            ->where('balance_total', '>', 0)
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->get(['id', 'code', 'invoice_number', 'invoice_date', 'created_at', 'grand_total', 'paid_total', 'balance_total']);

        $today = now()->startOfDay();
        $open->transform(function ($p) use ($today) {
            $baseDate = $p->invoice_date ?: $p->created_at; // fallback si no hay factura
            $p->days = $today->diffInDays(\Illuminate\Support\Carbon::parse($baseDate));
            $p->bucket = match (true) {
                $p->days <= 30 => '0-30',
                $p->days <= 60 => '31-60',
                $p->days <= 90 => '61-90',
                default => '90+',
            };
            return $p;
        });

        $account = [
            'total_open'  => $open->sum('balance_total'),
            'grand_total' => $open->sum('grand_total'),
            'paid_total'  => $open->sum('paid_total'),
            'count'       => $open->count(),
        ];

        $aging = [
            '0_30'    => $open->where('bucket', '0-30')->sum('balance_total'),
            '31_60'   => $open->where('bucket', '31-60')->sum('balance_total'),
            '61_90'   => $open->where('bucket', '61-90')->sum('balance_total'),
            '90_plus' => $open->where('bucket', '90+')->sum('balance_total'),
            'total'   => $open->sum('balance_total'),
        ];

        return inertia('admin/suppliers/show', [
            'supplier'      => $supplier,
            'openPurchases' => $open,
            'account'       => $account,
            'aging'         => $aging,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSupplierRequest $request, Supplier $supplier)
    {
        $data = $request->validated();
        $supplier->update($data);
        return back()->with('success', 'Proveedor actualizado.');
    }
    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Supplier $supplier)
    {
        // Si quieres prevenir borrar con compras asociadas
        if ($supplier->purchases()->exists()) {
            throw ValidationException::withMessages(['supplier' => 'No se puede eliminar: tiene compras asociadas.']);
        }
        $supplier->delete();
        return redirect()->route('admin.supplier.index')->with('success', 'Proveedor eliminado.');
    }
}
