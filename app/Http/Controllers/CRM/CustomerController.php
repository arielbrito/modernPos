<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\StoreCustomerRequest;
use App\Http\Requests\Customers\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\DgiiTaxpayer;
use App\Models\Sale;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $req)
    {
        $this->authorize('viewAny', Customer::class);

        $filters = [
            'search'       => (string) $req->query('search', ''),
            'only_active'  => $req->boolean('only_active', false),
            'only_taxpayers' => $req->boolean('only_taxpayers', false),
        ];

        $q = Customer::query();

        if ($filters['search'] !== '') {
            $s = $filters['search'];
            $q->where(function ($qq) use ($s) {
                $qq->where('name', 'ILIKE', "%{$s}%")
                    ->orWhere('document_number', 'ILIKE', "%{$s}%")
                    ->orWhere('document_number_norm', 'LIKE', preg_replace('/\D+/', '', $s) . '%')
                    ->orWhere('code', 'ILIKE', "%{$s}%");
            });
        }

        if ($filters['only_active']) {
            $q->where('active', true);
        }

        if ($filters['only_taxpayers']) {
            $q->where('is_taxpayer', true);
        }

        $customers = $q->latest()->paginate(20)->withQueryString([
            'search' => $filters['search'],
            'only_active' => $filters['only_active'],
            'only_taxpayers' => $filters['only_taxpayers'],
        ]);

        return Inertia::render('crm/customers/index', [
            'clientes' => $customers,
            'filters'   => $filters,
        ]);
    }

    public function store(StoreCustomerRequest $req)
    {
        $this->authorize('create', Customer::class);
        $data = $req->validated();
        $data['code'] = $data['code'] ?? ('CUST-' . now()->format('Ymd') . '-' . str_pad((string)((Customer::max('id') ?? 0) + 1), 5, '0', STR_PAD_LEFT));

        try {
            Customer::create($data);
            return to_route('customers.index')->with('success', 'Cliente creado.');
        } catch (QueryException $e) {
            if ((string)$e->getCode() === '23505') {
                return back()->withErrors(['document_number' => 'Ya existe un cliente con ese documento.'])->withInput();
            }
            report($e);
            return back()->withErrors(['general' => 'No se pudo guardar el cliente.'])->withInput();
        }
    }


    // app/Http/Controllers/CRM/CustomerController.php


    public function show(Customer $customer)
    {
        $this->authorize('view', $customer);

        // Ventas del cliente
        $sales = Sale::query()
            ->where('customer_id', $customer->id)
            ->latest('occurred_at')
            ->paginate(15);

        // Stats rápidos usando columnas de sales
        $stats = [
            'invoices_count' => (int) $sales->total(),                     // cantidad de ventas
            'total_purchase' => (float) $sales->sum('total'),              // total vendido
            'total_paid'     => (float) $sales->sum('paid_total'),         // total pagado
            'balance'        => (float) $sales->sum('due_total'),          // saldo pendiente acumulado
        ];

        return inertia('crm/customers/show', [
            'customer' => $customer->only([
                'id',
                'code',
                'name',
                'kind',
                'document_type',
                'document_number',
                'email',
                'phone',
                'address',
                'is_taxpayer',
                'active',
                'allow_credit',
                'credit_limit',
                'credit_terms_days',
                'created_at',
                'balance',
            ]),
            'stats' => $stats,
            'invoices' => $sales->through(fn(Sale $s) => [
                'id'         => $s->id,
                'date'       => optional($s->occurred_at ?? $s->created_at)->toDateString(),
                'number'     => $s->number,                         // POS-YYYY-######
                'ncf'        => $s->ncf_number,                     // muestra NCF
                'status'     => $s->status,
                'items_count' => (int)($s->lines()->count()),        // rápido
                'total'      => (float)$s->total,
                'paid'       => (float)$s->paid_total,
                'due'        => (float)max(0, $s->due_total),
            ]),
        ]);
    }





    public function update(UpdateCustomerRequest $req, Customer $customer)
    {
        $this->authorize('update', $customer);
        $data = $req->validated();

        try {
            $customer->update($data);
            return to_route('crm.customers.index')->with('success', 'Cliente actualizado.');
        } catch (QueryException $e) {
            if ((string)$e->getCode() === '23505') {
                return back()->withErrors(['document_number' => 'Ya existe un cliente con ese documento.'])->withInput();
            }
            report($e);
            return back()->withErrors(['general' => 'No se pudo actualizar el cliente.'])->withInput();
        }
    }

    public function destroy(Customer $customer)
    {
        $this->authorize('delete', $customer);
        // (Opcional) Validar que no tenga ventas vinculadas…
        $customer->delete();
        return back()->with('success', 'Cliente eliminado.');
    }

    public function export(Request $req): StreamedResponse
    {
        $this->authorize('viewAny', Customer::class);

        $filters = [
            'search' => (string) $req->query('search', ''),
            'only_active' => $req->boolean('only_active', false),
            'only_taxpayers' => $req->boolean('only_taxpayers', false),
        ];

        $q = Customer::query();

        if ($filters['search'] !== '') {
            $s = $filters['search'];
            $q->where(function ($qq) use ($s) {
                $qq->where('name', 'ILIKE', "%{$s}%")
                    ->orWhere('document_number', 'ILIKE', "%{$s}%")
                    ->orWhere('document_number_norm', 'LIKE', preg_replace('/\D+/', '', $s) . '%')
                    ->orWhere('code', 'ILIKE', "%{$s}%");
            });
        }
        if ($filters['only_active'])     $q->where('active', true);
        if ($filters['only_taxpayers'])  $q->where('is_taxpayer', true);

        $filename = 'customers_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Code', 'Name', 'Kind', 'DocType', 'Document', 'Email', 'Phone', 'Active', 'Taxpayer', 'CreditLimit', 'CreditDays']);

            $q->orderBy('id')->chunk(1000, function ($rows) use ($out) {
                foreach ($rows as $c) {
                    fputcsv($out, [
                        $c->code,
                        $c->name,
                        $c->kind,
                        $c->document_type,
                        $c->document_number,
                        $c->email,
                        $c->phone,
                        $c->active ? 'Yes' : 'No',
                        $c->is_taxpayer ? 'Yes' : 'No',
                        number_format((float)$c->credit_limit, 2, '.', ''),
                        (int)$c->credit_terms_days,
                    ]);
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }


    // app/Http/Controllers/CRM/CustomerController.php

    public function quickSearch(Request $req)
    {
        $this->authorize('viewAny', Customer::class);

        $term  = trim((string)$req->query('term', ''));
        $limit = min((int)$req->query('limit', 12), 20);
        $digits = preg_replace('/\D+/', '', $term);

        // --- 1) CLIENTES FIJOS ---
        $cq = Customer::query()
            ->select('id', 'name', 'document_type', 'document_number', 'document_number_norm', 'is_taxpayer', 'active')
            ->where('active', true);

        if ($term !== '') {
            $cq->where(function ($q) use ($term, $digits) {
                $q->where('name', 'ILIKE', "%{$term}%")
                    ->orWhere('code', 'ILIKE', "%{$term}%")
                    ->orWhere('document_number', 'ILIKE', "%{$term}%");

                if ($digits !== '') {
                    $q->orWhere('document_number_norm', 'LIKE', "{$digits}%");
                }
            });
        }

        $customers = $cq->orderBy('name')->limit($limit)->get();

        // Para evitar duplicados por documento (si el mismo doc está en padrón)
        $seenDocs = $customers
            ->map(fn($c) => in_array($c->document_type, ['RNC', 'CED']) ? (string)$c->document_number_norm : null)
            ->filter()
            ->values()
            ->all();

        $rows = $customers->map(function ($c) {
            return [
                'source'          => 'customer',
                'id'              => (int)$c->id,
                'name'            => (string)$c->name,
                'document_type'   => (string)$c->document_type,  // RNC|CED|NONE
                'document_number' => $c->document_number,
                'is_taxpayer'     => (bool)$c->is_taxpayer,
                'status'          => null,
            ];
        })->all();

        // --- 2) PADRÓN DGII ---
        $pq = DgiiTaxpayer::query()
            ->select('id', 'doc_type', 'doc_number', 'doc_number_norm', 'name', 'status', 'is_taxpayer');

        if ($digits !== '') {
            $pq->where('doc_number_norm', 'LIKE', "{$digits}%");
        } elseif ($term !== '') {
            $pq->where('name', 'ILIKE', "%{$term}%");
        } else {
            // sin término no devolvemos padrón (evita listas gigantes)
            $pq->whereRaw('false');
        }

        if (!empty($seenDocs)) {
            $pq->whereNotIn('doc_number_norm', $seenDocs);
        }

        $padron = $pq->orderBy('name')->limit($limit)->get();

        foreach ($padron as $p) {
            $rows[] = [
                'source'          => 'padron',
                // no es cliente => no mandamos id de customers
                'name'            => (string)$p->name,
                'document_type'   => (string)$p->doc_type,   // RNC|CED
                'document_number' => (string)$p->doc_number,
                'is_taxpayer'     => (bool)$p->is_taxpayer,
                'status'          => $p->status,
                'padron_id'       => (int)$p->id,
            ];
        }

        // combinamos y capamos por límite final
        $rows = array_slice($rows, 0, $limit);

        return response()->json($rows);
    }
}
