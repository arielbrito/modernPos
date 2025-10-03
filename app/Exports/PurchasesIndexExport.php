<?php

namespace App\Exports;

use App\Models\Purchase;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Support\Arr;

class PurchasesIndexExport implements FromArray, WithHeadings
{
    public function __construct(private array $filters = []) {}

    public function headings(): array
    {
        return ['Código', 'Proveedor', 'Estado', 'Factura', 'Fecha Factura', 'Total', 'Devoluciones', 'Balance'];
    }

    public function array(): array
    {
        $search = Arr::get($this->filters, 'search');
        $status = Arr::get($this->filters, 'status');

        $query = Purchase::query()
            ->with('supplier')
            ->withSum('returns as returns_total', 'total_value')
            ->when($search, function ($q, $term) {
                $q->where(function ($qq) use ($term) {
                    $qq->where('code', 'ilike', "%{$term}%")
                        ->orWhereHas('supplier', fn($s) => $s->where('name', 'ilike', "%{$term}%"));
                });
            })
            ->when($status && $status !== 'all', fn($q) => $q->where('status', $status))
            ->latest();

        $rows = [];
        $query->chunk(1000, function ($chunk) use (&$rows) {
            foreach ($chunk as $p) {
                $rows[] = [
                    $p->code,
                    optional($p->supplier)->name ?? '—',
                    $p->status,
                    $p->invoice_number ?? '—',
                    optional($p->invoice_date)?->format('d/m/Y') ?? '—',
                    (float)$p->grand_total,
                    (float)($p->returns_total ?? 0),
                    (float)($p->true_balance ?? $p->balance_total),
                ];
            }
        });

        return $rows;
    }
}
