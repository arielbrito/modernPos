<?php

namespace App\Exports;

use App\Models\SaleReturn;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SaleReturnListExport implements FromArray, WithHeadings
{
    public function __construct(private array $filters) {}

    public function headings(): array
    {
        return ['ID', 'Fecha', 'Venta', 'Cliente', 'Moneda', 'Total', 'Impuesto', 'Costo'];
    }

    public function array(): array
    {
        $f = $this->filters;
        $q = trim((string)($f['q'] ?? ''));
        $from = $f['from'] ?? null;
        $to = $f['to'] ?? null;
        $store = $f['store_id'] ?? null;

        $query = SaleReturn::query()->with(['sale:id,number,customer_id,store_id', 'sale.customer:id,name'])
            ->when($q !== '', fn($qq) => $qq->whereHas('sale', fn($s) => $s->where('number', 'ilike', "%{$q}%")
                ->orWhereHas('customer', fn($c) => $c->where('name', 'ilike', "%{$q}%"))))
            ->when($store, fn($qq) => $qq->whereHas('sale', fn($s) => $s->where('store_id', $store)))
            ->when($from, fn($qq) => $qq->whereDate('created_at', '>=', $from))
            ->when($to, fn($qq) => $qq->whereDate('created_at', '<=', $to))
            ->orderByDesc('id')
            ->get();

        return $query->map(fn($r) => [
            $r->id,
            $r->created_at?->toDateTimeString(),
            $r->sale?->number,
            $r->sale?->customer?->name,
            $r->currency_code,
            (float)$r->total_refund,
            (float)($r->tax_refund ?? 0),
            (float)($r->cost_refund ?? 0),
        ])->toArray();
    }
}
