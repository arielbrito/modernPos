<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StorePurchaseReturnRequest;
use App\Models\Purchase;
use App\Services\PurchaseReturnService;
use Illuminate\Support\Facades\Auth;
use App\Models\PurchaseReturn;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class PurchaseReturnController extends Controller
{
    public function __construct(private PurchaseReturnService $returnService) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
        ]);

        // --- CORRECCIÓN AQUÍ ---
        // Usamos data_get() para obtener el valor de forma segura. Si no existe, devuelve null.
        $from = data_get($filters, 'from') ? Carbon::parse($filters['from']) : now()->subDays(30);
        $to   = data_get($filters, 'to') ? Carbon::parse($filters['to']) : now();

        // --- Listado Paginado ---
        $returns = PurchaseReturn::query()
            ->with(['purchase.supplier', 'user:id,name', 'store:id,name'])
            ->whereBetween('return_date', [$from->startOfDay(), $to->endOfDay()])
            ->when($filters['supplier_id'] ?? null, function ($query, $supplierId) {
                if ($supplierId !== 'all') {
                    $query->whereHas('purchase', fn($q) => $q->where('supplier_id', $supplierId));
                }
            })
            ->latest('return_date')
            ->paginate(20)
            ->withQueryString();

        // --- KPIs ---
        $stats = [
            'total_value_returned' => PurchaseReturn::whereBetween('return_date', [$from, $to])->sum('total_value'),
            'count' => $returns->total(),
        ];

        return Inertia::render('inventory/returns/index', [
            'returns' => $returns,
            'stats' => $stats,
            'filters' => $filters,
            'suppliers' => Supplier::where('is_active', true)->get(['id', 'name']),
        ]);
    }


    public function store(StorePurchaseReturnRequest $request, Purchase $purchase)
    {
        try {
            $this->returnService->create(
                $purchase,
                $request->validated(),
                Auth::id()
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('inventory.purchases.show', $purchase)
            ->with('success', 'Devolución registrada exitosamente.');
    }
}
