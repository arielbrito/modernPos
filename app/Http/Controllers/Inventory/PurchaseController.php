<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Inventory\Purchase\StorePurchasePaymentRequest;
use App\Http\Requests\Inventory\Purchase\StorePurchaseRequest;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Services\PurchaseReceivingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseReceivingService $receivingService) {}
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Obtenemos los filtros de la URL. 'search' puede ser nulo.
        $filters = $request->only('search');

        $purchases = Purchase::query()
            // Cargamos la relación con el proveedor para evitar problemas N+1
            ->with('supplier')
            // Aplicamos el filtro de búsqueda solo si existe en la solicitud
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    // Buscamos en el código de la compra
                    $q->where('code', 'like', "%{$search}%")
                        // O buscamos en el nombre del proveedor a través de la relación
                        ->orWhereHas('supplier', function ($supplierQuery) use ($search) {
                            $supplierQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            // Ordenamos por los más recientes
            ->latest()
            // Paginamos los resultados
            ->paginate(20)
            // ¡Importante! Agrega los parámetros de la URL a los links de paginación
            ->withQueryString();

        return inertia('inventory/purchases/index', [
            'compras' => $purchases,
            // Pasamos los filtros de vuelta a la vista para mantener el estado del input
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('inventory/purchases/create', [
            'suppliers' => Supplier::where('is_active', true)->get(['id', 'name']),
            'products' => Product::with('variants')->get()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePurchaseRequest $request)
    {
        $data = $request->validated();
        $userId = Auth::id();
        $storeId = session('active_store_id');

        if (!$storeId) {
            // Esto podría ser un error o una redirección, dependiendo de tu preferencia.
            return back()->with('error', 'No se ha seleccionado una tienda activa. Por favor, selecciona una tienda para continuar.');
        }

        return DB::transaction(function () use ($data, $userId, $storeId) {
            $code = $this->nextCode();


            $purchase = Purchase::create([
                'supplier_id' => $data['supplier_id'],
                'code' => $code,
                'status' => 'draft',
                'invoice_number' => $data['invoice_number'] ?? null,
                'invoice_date' => $data['invoice_date'] ?? null,
                'currency' => $data['currency'],
                'exchange_rate' => $data['exchange_rate'],
                'freight' => $data['freight'] ?? 0,
                'other_costs' => $data['other_costs'] ?? 0,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'store_id' => $storeId,
            ]);

            $subtotal = 0;
            $discountTotal = 0;
            $taxTotal = 0;
            $lineTotals = [];

            foreach ($data['items'] as $row) {
                $qty = (float)$row['qty_ordered'];
                $unit = (float)$row['unit_cost'];
                $discPct = isset($row['discount_pct']) ? (float)$row['discount_pct'] : 0;
                $discAmount = isset($row['discount_amount']) ? (float)$row['discount_amount'] : ($unit * $qty * ($discPct / 100));
                $taxPct = isset($row['tax_pct']) ? (float)$row['tax_pct'] : 0;
                $base = $unit * $qty;
                $taxAmount = ($base - $discAmount) * ($taxPct / 100);
                $lineTotal = $base - $discAmount + $taxAmount; // sin landed cost aún

                $item = PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_variant_id' => $row['product_variant_id'],
                    'qty_ordered' => $qty,
                    'qty_received' => 0,
                    'unit_cost' => $unit,
                    'discount_pct' => $discPct,
                    'discount_amount' => $discAmount,
                    'tax_pct' => $taxPct,
                    'tax_amount' => $taxAmount,
                    'landed_cost_alloc' => 0,
                    'line_total' => $lineTotal,
                ]);

                $subtotal += $base;
                $discountTotal += $discAmount;
                $taxTotal += $taxAmount;
                $lineTotals[$item->id] = $lineTotal;
            }

            // Prorrateo de flete/otros costos
            $landed = ($purchase->freight + $purchase->other_costs);
            if ($landed > 0) {
                $sumLineTotals = array_sum($lineTotals) ?: 1;
                foreach ($lineTotals as $itemId => $lt) {
                    $alloc = round(($lt / $sumLineTotals) * $landed, 4);
                    PurchaseItem::where('id', $itemId)->update([
                        'landed_cost_alloc' => $alloc,
                        'line_total' => DB::raw('line_total + ' . $alloc),
                    ]);
                }
            }

            $grandTotal = $subtotal - $discountTotal + $taxTotal + $landed;

            $purchase->update([
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => $taxTotal,
                'grand_total' => $grandTotal,
                'paid_total' => 0,
                'balance_total' => $grandTotal,
            ]);

            return redirect()->route('inventory.purchases.index')->with('success', 'Compra creada (borrador).');
        });
    }

    public function approve(Purchase $purchase)
    {
        if ($purchase->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Solo se puede aprobar un borrador.']);
        }
        $purchase->update(['status' => 'approved', 'approved_by' => Auth::id()]);
        return back()->with('success', 'Compra aprobada.');
    }

    public function receive(Purchase $purchase, ReceivePurchaseRequest $request)
    {
        $items = $request->validated('items');
        $this->receivingService->receive($purchase, $items, Auth::id());
        return back()->with('success', 'Recepción registrada.');
    }

    public function storePayment(Purchase $purchase, StorePurchasePaymentRequest $request)
    {
        if (!in_array($purchase->status, ['received', 'partially_received'])) {
            throw ValidationException::withMessages([
                'status' => 'No se pueden registrar pagos en una compra que aún no ha sido recibida.'
            ]);
        }
        $data = $request->validated();
        $amount = (float)$data['paid_amount'];

        if ($amount > (float)$purchase->balance_total) {
            throw ValidationException::withMessages(['paid_amount' => 'El pago excede el balance.']);
        }

        DB::transaction(function () use ($purchase, $data, $amount) {
            PurchasePayment::create([
                'purchase_id' => $purchase->id,
                'method' => $data['method'],
                'paid_amount' => $amount,
                'paid_at' => $data['paid_at'],
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $purchase->increment('paid_total', $amount);
            $purchase->decrement('balance_total', $amount);
        });

        return back()->with('success', 'Pago registrado.');
    }

    public function cancel(Purchase $purchase)
    {
        if (in_array($purchase->status, ['received', 'partially_received'])) {
            throw ValidationException::withMessages(['status' => 'No se puede cancelar una compra con recepciones.']);
        }
        $purchase->update(['status' => 'cancelled']);
        return back()->with('success', 'Compra cancelada.');
    }


    /**
     * Display the specified resource.
     */
    public function show(Purchase $purchase)
    {
        $purchase->load(['supplier', 'items.productVariant.product', 'payments']);
        return inertia('inventory/purchases/show', ['purchase' => $purchase]);
    }


    private function nextCode(): string
    {
        $seq = (int) (Purchase::max('id') ?? 0) + 1;
        return 'OC-' . now()->format('Ymd') . '-' . str_pad((string)$seq, 5, '0', STR_PAD_LEFT);
    }

    public function searchProducts(Request $request)
    {
        $term = $request->query('term', '');

        if (strlen($term) < 2) {
            return response()->json([]);
        }

        $products = Product::with('variants')
            ->where('name', 'ILIKE', "%{$term}%")
            ->orWhereHas('variants', fn($q) => $q->where('sku', 'ILIKE', "%{$term}%"))
            ->take(10)
            ->get();

        return response()->json($products);
    }
}
