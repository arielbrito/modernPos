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
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\PurchaseItemsExport;
use App\Exports\PurchasesIndexExport;
use App\Http\Requests\Inventory\Purchase\EmailPurchaseRequest;
use App\Jobs\SendPurchaseOrderEmail;
use App\Mail\PurchaseOrderMail;
use App\Models\PurchaseEmailLog;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

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
        $filters = $request->validate([
            'search' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'email'  => ['nullable', 'in:all,sent,queued,failed,never'],
        ]);

        $search = trim($filters['search'] ?? '');
        $status = $filters['status'] ?? 'all';
        $email  = $filters['email']  ?? 'all';

        // --- devoluciones por compra
        $returnsAgg = DB::table('purchase_returns')
            ->selectRaw('purchase_id, COALESCE(SUM(total_value),0) AS returns_total')
            ->groupBy('purchase_id');

        // --- último email por compra
        $emailAgg = DB::table('purchase_email_logs AS el')
            ->selectRaw("
            el.purchase_id,
            MAX(el.created_at) AS last_email_at,
            (ARRAY_AGG(el.status ORDER BY el.created_at DESC))[1] AS last_email_status
        ")
            ->groupBy('el.purchase_id');

        // --- BASE con joins y filtros, SIN select aún
        $base = Purchase::query()
            ->leftJoinSub($returnsAgg, 'ret', fn($j) => $j->on('ret.purchase_id', '=', 'purchases.id'))
            ->leftJoinSub($emailAgg,   'em',  fn($j) => $j->on('em.purchase_id',  '=', 'purchases.id'))
            ->with(['supplier']);

        if ($search !== '') {
            $base->where(function ($q) use ($search) {
                $q->where('purchases.code', 'ILIKE', "%{$search}%")
                    ->orWhere('purchases.invoice_number', 'ILIKE', "%{$search}%")
                    ->orWhereHas('supplier', fn($qq) => $qq->where('name', 'ILIKE', "%{$search}%"));
            });
        }

        if ($status !== 'all') {
            $base->where('purchases.status', $status);
        }

        if ($email !== 'all') {
            switch ($email) {
                case 'never':
                    $base->whereNull('em.last_email_at');
                    break;
                case 'sent':
                case 'queued':
                case 'failed':
                    $base->where('em.last_email_status', $email);
                    break;
            }
        }

        // --- KPI/TOTALES (agregados en una consulta SEPARADA)
        $forTotals = (clone $base)
            ->cloneWithout(['columns', 'orders']) // quita selects y orders previos si los hubiera
            ->selectRaw('COALESCE(SUM(purchases.grand_total),0) AS total_purchased_in_period')
            ->selectRaw('COALESCE(SUM(purchases.grand_total - COALESCE(purchases.paid_total,0) - COALESCE(ret.returns_total,0)),0) AS total_balance')
            ->first();

        $draftCount = (clone $base)
            ->cloneWithout(['columns', 'orders'])
            ->where('purchases.status', 'draft')
            ->count('purchases.id');

        // --- LISTA (paginada) con columnas por fila (SIN agregados globales)
        $list = (clone $base)
            ->select('purchases.*')
            ->selectRaw('COALESCE(ret.returns_total,0) AS returns_total')
            ->selectRaw('COALESCE(em.last_email_at, NULL) AS last_email_at')
            ->selectRaw('COALESCE(em.last_email_status, NULL) AS last_email_status')
            ->selectRaw('(purchases.grand_total - COALESCE(purchases.paid_total,0) - COALESCE(ret.returns_total,0)) AS true_balance')
            ->orderByDesc('purchases.created_at')
            ->paginate(15)
            ->withQueryString();

        // normaliza tipos numéricos para el front
        $list->getCollection()->transform(function ($p) {
            $p->returns_total = (float) ($p->returns_total ?? 0);
            $p->true_balance  = (float) ($p->true_balance ?? 0);
            return $p;
        });

        return Inertia::render('inventory/purchases/index', [
            'compras' => $list,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'email'  => $email,
            ],
            'stats' => [
                'totalPurchasedInPeriod' => (float) $forTotals->total_purchased_in_period,
                'totalBalance'           => (float) $forTotals->total_balance,
                'draftCount'             => $draftCount,
            ],
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

    public function receiveForm(Purchase $purchase)
    {
        $this->authorize('receive', $purchase);

        $purchase->load([
            'supplier:id,name',
            'items:id,purchase_id,product_variant_id,qty_ordered,qty_received,unit_cost',
            'items.productVariant:id,sku,product_id',
            'items.productVariant.product:id,name',
        ]);

        return Inertia::render('inventory/purchases/receive', [
            'purchase' => $purchase,
        ]);
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
            ->active()
            ->stockable()
            ->where(function ($q) use ($term) {
                $q->where('name', 'ILIKE', "%{$term}%")
                    ->orWhereHas('variants', fn($vq) => $vq->where('sku', 'ILIKE', "%{$term}%"));
            })
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

    public function print(Purchase $purchase, Request $request)
    {
        $purchase->load([
            'store',
            'supplier',
            'items.productVariant.product',
        ]);

        $paper = in_array($request->get('paper'), ['a4', 'letter']) ? $request->get('paper') : 'letter';
        $isCopy = $request->boolean('copy');
        $download = $request->boolean('download');

        $pdf = Pdf::loadView('prints.purchase_order', [
            'purchase' => $purchase,
        ])->setPaper($paper); // 'a4' | 'letter'

        $filename = 'compra-' . $purchase->code . ($isCopy ? '-copia' : '') . '.pdf';

        if ($download) {
            return $pdf->download($filename);
        }
        return $pdf->stream($filename);
    }


    public function exportCsv(Purchase $purchase): StreamedResponse
    {
        $purchase->load(['supplier', 'store', 'items.productVariant.product']);

        $filename = 'compra-' . $purchase->code . '.csv';
        $headers  = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        return response()->streamDownload(function () use ($purchase) {
            // BOM UTF-8 para Excel/Numbers
            echo chr(0xEF) . chr(0xBB) . chr(0xBF);

            $out = fopen('php://output', 'w');

            // Encabezado contextual
            fputcsv($out, ['Código', $purchase->code]);
            fputcsv($out, ['Proveedor', optional($purchase->supplier)->name ?? '—']);
            fputcsv($out, ['Tienda', optional($purchase->store)->name ?? '—']);
            fputcsv($out, ['Factura', $purchase->invoice_number ?? '—']);
            fputcsv($out, ['Fecha Factura', optional($purchase->invoice_date)?->format('d/m/Y') ?? '—']);
            fputcsv($out, []); // línea en blanco

            // Encabezados de ítems
            fputcsv($out, [
                'SKU',
                'Producto',
                'Cant. Ordenada',
                'Cant. Recibida',
                'Pendiente',
                'Costo Unit.',
                'Desc %',
                'Imp %',
                'Total Línea'
            ]);

            foreach ($purchase->items as $it) {
                $sku   = $it->productVariant->sku ?? '';
                $name  = $it->productVariant->product->name ?? '';
                $qo    = (float) $it->qty_ordered;
                $qr    = (float) $it->qty_received;
                $pend  = max(0, $qo - $qr);
                $unit  = (float) $it->unit_cost;
                $disc  = (float) ($it->discount_pct ?? 0);
                $tax   = (float) ($it->tax_pct ?? 0);
                $total = (float) $it->line_total;

                fputcsv($out, [$sku, $name, $qo, $qr, $pend, $unit, $disc, $tax, $total]);
            }

            // Totales
            fputcsv($out, []); // blank
            fputcsv($out, ['Subtotal', (float) $purchase->subtotal]);
            if ((float)$purchase->discount_total > 0) {
                fputcsv($out, ['Descuentos', (float) $purchase->discount_total]);
            }
            if ((float)$purchase->tax_total > 0) {
                fputcsv($out, ['Impuestos', (float) $purchase->tax_total]);
            }
            if (((float)$purchase->freight + (float)$purchase->other_costs) > 0) {
                fputcsv($out, ['Flete + Otros', (float)$purchase->freight + (float)$purchase->other_costs]);
            }
            fputcsv($out, ['Total', (float) $purchase->grand_total]);
            if ((float)$purchase->paid_total > 0) {
                fputcsv($out, ['Pagado', (float) $purchase->paid_total]);
            }
            fputcsv($out, ['Balance', (float) $purchase->balance_total]);

            fclose($out);
        }, $filename, $headers);
    }

    // --- EXPORTAR UNA COMPRA: XLSX ---
    public function exportXlsx(Purchase $purchase)
    {
        $purchase->load(['supplier', 'store', 'items.productVariant.product']);
        $filename = 'compra-' . $purchase->code . '.xlsx';
        return Excel::download(new PurchaseItemsExport($purchase), $filename);
    }

    // --- (Opcional) Export del listado filtrado: CSV ---
    public function exportIndexCsv(Request $request): StreamedResponse
    {
        $filters = $request->only('search', 'status');

        $query = Purchase::query()
            ->with('supplier')
            ->withSum('returns as returns_total', 'total_value')
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('code', 'ilike', "%{$search}%")
                        ->orWhereHas('supplier', fn($s) => $s->where('name', 'ilike', "%{$search}%"));
                });
            })
            ->when(($filters['status'] ?? null) && $filters['status'] !== 'all', function ($q) use ($filters) {
                $q->where('status', $filters['status']);
            })
            ->latest();

        $filename = 'compras.csv';
        $headers  = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        return response()->streamDownload(function () use ($query) {
            echo chr(0xEF) . chr(0xBB) . chr(0xBF);
            $out = fopen('php://output', 'w');

            fputcsv($out, ['Código', 'Proveedor', 'Estado', 'Factura', 'Fecha Factura', 'Total', 'Devoluciones', 'Balance']);
            $query->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $p) {
                    fputcsv($out, [
                        $p->code,
                        optional($p->supplier)->name ?? '—',
                        $p->status,
                        $p->invoice_number ?? '—',
                        optional($p->invoice_date)?->format('d/m/Y') ?? '—',
                        (float)$p->grand_total,
                        (float)($p->returns_total ?? 0),
                        (float)$p->true_balance ?? (float)$p->balance_total, // según tu cálculo
                    ]);
                }
            });

            fclose($out);
        }, $filename, $headers);
    }

    // --- (Opcional) Export del listado filtrado: XLSX ---
    public function exportIndexXlsx(Request $request)
    {
        return Excel::download(new PurchasesIndexExport($request->all()), 'compras.xlsx');
    }



    public function sendEmail(Request $request, Purchase $purchase)
    {
        $this->authorize('view', $purchase);

        $validated = $request->validate([
            'to'      => ['required', 'email'],
            'cc'      => ['nullable', 'email'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:2000'],
            'paper'   => ['nullable', Rule::in(['a4', 'letter'])],
            'copy'    => ['nullable', Rule::in(['0', '1'])],
            'queue'   => ['nullable', 'boolean'],
        ]);

        // Normalizaciones
        $enqueue = $request->boolean('queue');                 // false si no viene
        $paper   = $validated['paper'] ?? 'letter';
        $isCopy  = ($validated['copy'] ?? '0') === '1';

        // Cargar relaciones para el PDF
        $purchase->load(['supplier', 'items.productVariant.product', 'store']);

        // Generar PDF
        $pdf = Pdf::loadView('prints.purchase_order', [
            'purchase' => $purchase,
            'isCopy'   => $isCopy,
        ])->setPaper($paper);

        // Escribir a storage con nombre único (queue-friendly)
        $dir      = 'tmp/purchase-orders';
        Storage::makeDirectory($dir);
        $uuid     = Str::orderedUuid()->toString();
        $filename = "orden-{$purchase->code}-{$uuid}.pdf";
        $path     = "{$dir}/{$filename}";
        Storage::put($path, $pdf->output());

        // Crear log inicial
        $log = PurchaseEmailLog::create([
            'purchase_id' => $purchase->id,
            'user_id'     => $request->user()->id ?? null,
            'to'          => $validated['to'],
            'cc'          => $validated['cc'] ?? null,
            'subject'     => $validated['subject'],
            'queued'      => $enqueue,
            'status'      => $enqueue ? 'queued' : 'sent',
            'attachment'  => $path,          // <- guarda dónde está el PDF
            // 'sent_at'   => null (lo pondrá el job o el flujo síncrono)
        ]);

        if ($enqueue) {
            // Envío en COLA (el Job borrará el archivo y actualizará el log)
            SendPurchaseOrderEmail::dispatch(
                logId: $log->id,
                purchaseId: $purchase->id,
                to: $validated['to'],
                cc: $validated['cc'] ?? null,
                subject: $validated['subject'],
                body: $validated['message'] ?? '',
                storagePath: $path,
                // filename: $filename,
            );

            return back()->with('success', 'Orden encolada para envío por email.');
        }

        // Envío SÍNCRONO
        try {
            $mailable = (new PurchaseOrderMail(
                purchase: $purchase,
                subjectLine: $validated['subject'],
                bodyMessage: $validated['message'] ?? ''
            ))->attachFromStorage($path, $filename, ['mime' => 'application/pdf']);

            Mail::to($validated['to'])
                ->when(!empty($validated['cc']), fn($m) => $m->cc($validated['cc']))
                ->send($mailable);

            $log->status  = 'sent';
            $log->sent_at = now();
            $log->save();

            return back()->with('success', 'Orden enviada por email.');
        } catch (\Throwable $e) {
            $log->status = 'failed';
            $log->error  = $e->getMessage();
            $log->save();

            return back()->with('error', 'No se pudo enviar el email: ' . $e->getMessage());
        } finally {
            // En síncrono lo limpiamos aquí (en cola lo limpia el Job)
            Storage::delete($path);
        }
    }
}
