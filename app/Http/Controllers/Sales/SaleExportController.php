<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SalesExport;

class SaleExportController extends Controller
{
    public function csv(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Sale::class);
        $query = $this->baseQuery($request);

        $filename = 'ventas_' . now()->format('Ymd_His') . '.csv';
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return Response::stream(function () use ($query) {
            $out = fopen('php://output', 'w');
            // BOM para Excel
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($out, [
                'Fecha',
                'Número',
                'NCF Tipo',
                'NCF',
                'Cliente',
                'Documento',
                'Contribuyente',
                'Subtotal',
                'Descuentos',
                'Impuestos',
                'Total',
                'Pagado',
                'Pendiente',
                'Estado',
                'Tienda'
            ]);

            $query->chunkById(1000, function ($rows) use ($out) {
                foreach ($rows as $s) {
                    fputcsv($out, [
                        optional($s->occurred_at)->format('Y-m-d H:i:s'),
                        $s->number,
                        $s->ncf_type,
                        $s->ncf_number,
                        $s->bill_to_name,
                        $s->bill_to_doc_type === 'NONE' ? '' : trim(($s->bill_to_doc_type ?? '') . ' ' . ($s->bill_to_doc_number ?? '')),
                        $s->bill_to_is_taxpayer ? 'Sí' : 'No',
                        number_format((float)$s->subtotal,       2, '.', ''),
                        number_format((float)$s->discount_total, 2, '.', ''),
                        number_format((float)$s->tax_total,      2, '.', ''),
                        number_format((float)$s->total,          2, '.', ''),
                        number_format((float)$s->paid_total,     2, '.', ''),
                        number_format((float)$s->due_total,      2, '.', ''),
                        $s->status,
                        $s->store?->code,
                    ]);
                }
            });

            fclose($out);
        }, 200, $headers);
    }

    public function xlsx(Request $request)
    {
        $this->authorize('viewAny', Sale::class);
        $query = $this->baseQuery($request);

        $file = 'ventas_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new SalesExport($query), $file);
    }

    private function baseQuery(Request $request)
    {
        $q = Sale::query()
            ->with(['store:id,code,name'])
            ->orderByDesc('occurred_at');

        if ($term = trim((string)$request->input('q'))) {
            $q->where(function ($w) use ($term) {
                $w->where('number', 'ilike', "%{$term}%")
                    ->orWhere('ncf_number', 'ilike', "%{$term}%")
                    ->orWhere('bill_to_name', 'ilike', "%{$term}%")
                    ->orWhere('bill_to_doc_number', 'ilike', "%{$term}%");
            });
        }
        if ($from = $request->input('from')) $q->whereDate('occurred_at', '>=', $from);
        if ($to   = $request->input('to'))   $q->whereDate('occurred_at', '<=', $to);
        if ($t    = $request->input('ncf_type')) $q->where('ncf_type', $t);
        if ($s    = $request->input('status'))   $q->where('status', $s);
        if ($sid  = $request->input('store_id')) $q->where('store_id', $sid);

        return $q;
    }
}
