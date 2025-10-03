<?php

namespace App\Exports;

use App\Models\Purchase;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class PurchaseItemsExport implements FromArray, WithHeadings, WithTitle
{
    public function __construct(private Purchase $purchase) {}

    public function title(): string
    {
        return 'Compra ' . $this->purchase->code;
    }

    public function headings(): array
    {
        return ['SKU', 'Producto', 'Cant. Ordenada', 'Cant. Recibida', 'Pendiente', 'Costo Unit.', 'Desc %', 'Imp %', 'Total Línea'];
    }

    public function array(): array
    {
        $rows = [];
        foreach ($this->purchase->items as $it) {
            $sku   = $it->productVariant->sku ?? '';
            $name  = $it->productVariant->product->name ?? '';
            $qo    = (float) $it->qty_ordered;
            $qr    = (float) $it->qty_received;
            $pend  = max(0, $qo - $qr);
            $unit  = (float) $it->unit_cost;
            $disc  = (float) ($it->discount_pct ?? 0);
            $tax   = (float) ($it->tax_pct ?? 0);
            $total = (float) $it->line_total;

            $rows[] = [$sku, $name, $qo, $qr, $pend, $unit, $disc, $tax, $total];
        }
        // Puedes añadir fila(s) de totales como hoja aparte si lo prefieres.
        return $rows;
    }
}
