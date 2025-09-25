<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Inventory\Purchase\StorePurchasePaymentRequest;
use App\Http\Requests\Inventory\Purchase\StorePurchaseRequest;
use App\Http\Requests\Inventory\Purchase\UpdatePurchaseRequest;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Services\PurchaseCreationService;
use App\Services\PurchaseReceivingService;
use App\Services\PurchaseUpdateService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class PurchaseController extends Controller
{
    use AuthorizesRequests;
    public function __construct(
        private PurchaseCreationService $creationService,
        private PurchaseReceivingService $receivingService,
        private PurchaseUpdateService $updateService,
    ) {}
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
            ->withSum('returns as returns_total', 'total_value')
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
            'filters' => $request->only(['search', 'status'])
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
        $storeId = session('active_store_id');

        if (!$storeId) {
            return back()->with('error', 'No se ha seleccionado una tienda activa.');
        }

        // 3. ¡Toda la lógica compleja ahora vive aquí!
        $this->creationService->create(
            $request->validated(),
            Auth::id(),
            $storeId
        );

        return redirect()->route('inventory.purchases.index')
            ->with('success', 'Orden de compra creada exitosamente.');
    }

    public function approve(Purchase $purchase)
    {
        $this->authorize('approve', $purchase);
        if ($purchase->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Solo se puede aprobar un borrador.']);
        }
        $purchase->update(['status' => 'approved', 'approved_by' => Auth::id()]);
        return back()->with('success', 'Compra aprobada.');
    }

    public function receive(Purchase $purchase, ReceivePurchaseRequest $request)
    {
        $this->authorize('receive', $purchase);
        $items = $request->validated('items');
        $this->receivingService->receive($purchase, $items, Auth::id());
        return back()->with('success', 'Recepción registrada.');
    }

    public function storePayment(Purchase $purchase, StorePurchasePaymentRequest $request)
    {
        $this->authorize('pay', $purchase);
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
        $this->authorize('cancel', $purchase);
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
        $purchase->load([
            'supplier',
            'items.productVariant.product',
            'payments',
            'returns.user:id,name' // Cargamos las devoluciones y el usuario que la hizo
        ]);
        return inertia('inventory/purchases/show', [
            'purchase' => $purchase,
            'can' => [
                'update' => Auth::user()->can('update', $purchase),
            ]
        ]);
    }


    // private function nextCode(): string
    // {
    //     $seq = (int) (Purchase::max('id') ?? 0) + 1;
    //     return 'OC-' . now()->format('Ymd') . '-' . str_pad((string)$seq, 5, '0', STR_PAD_LEFT);
    // }

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

    public function uploadAttachment(Purchase $purchase, Request $request)
    {
        $request->validate([
            'files'   => ['required', 'array', 'min:1'],
            'files.*' => ['file', 'max:5120', 'mimes:pdf,jpg,jpeg,png,webp,heic,heif,xlsx,xls,csv,xml,doc,docx,txt'],
        ]);

        $disk = 'public';
        $base = "purchases/{$purchase->id}";

        $attachments = $purchase->attachments ?? [];

        /** @var UploadedFile $file */
        foreach ($request->file('files', []) as $file) {
            $path = $file->store($base, $disk);

            $attachments[] = [
                'id'   => (string) Str::uuid(),
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'size' => $file->getSize(),
                'mime' => $file->getClientMimeType(),
                'disk' => $disk,
            ];
        }

        $purchase->update(['attachments' => $attachments]);

        return back()->with('success', 'Archivo(s) subido(s) correctamente.');
    }

    public function destroyAttachment(Purchase $purchase, string $attachment)
    {
        $at = collect($purchase->attachments ?? [])->firstWhere('id', $attachment);

        if (!$at) {
            return back()->with('error', 'Adjunto no encontrado.');
        }

        // borra el archivo físico (si existe)
        if (!empty($at['disk']) && !empty($at['path'])) {
            Storage::disk($at['disk'])->delete($at['path']);
        }

        $remain = collect($purchase->attachments ?? [])->reject(fn($a) => $a['id'] === $attachment)->values()->all();
        $purchase->update(['attachments' => $remain]);

        return back()->with('success', 'Adjunto eliminado.');
    }

    public function downloadAttachment(Purchase $purchase, string $attachment)
    {
        $at = collect($purchase->attachments ?? [])->firstWhere('id', $attachment);
        if (!$at) {
            abort(404);
        }

        $disk = $at['disk'] ?? 'public';
        $path = $at['path'] ?? null;
        if (!$path || !Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        return Storage::disk($disk)->download($path, $at['name'] ?? basename($path));
    }


    public function edit(Purchase $purchase)
    {
        $this->authorize('update', $purchase);
        // El Policy ya ha verificado que se puede editar.
        $purchase->load('items.productVariant.product'); // Cargar relaciones necesarias

        return Inertia::render('inventory/purchases/edit', [
            'purchase'  => $purchase,
            'suppliers' => Supplier::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase)
    {
        $this->authorize('update', $purchase);
        $this->updateService->update($purchase, $request->validated());

        return redirect()->route('inventory.purchases.show', $purchase)
            ->with('success', 'Compra actualizada exitosamente.');
    }
}
