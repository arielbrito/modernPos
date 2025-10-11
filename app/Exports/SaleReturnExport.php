<?php

namespace App\Exports;

use App\Models\{SaleReturn, SaleReturnLine};
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class SaleReturnExport implements FromArray, WithHeadings, WithTitle
{
    public function __construct(private int $returnId) {}

    public function title(): string
    {
        return 'Devolucion';
    }

    public function headings(): array
    {
        return ['Return ID', 'Sale #', 'Fecha', 'Moneda', 'Total', 'Subtotal', 'Impuesto', 'Descuento', 'Costo', 'Linea', 'Qty', 'Subtotal Part', 'Tax Part', 'Refund Amount', 'Motivo'];
    }

    public function array(): array
    {
        $r = SaleReturn::with(['sale', 'lines'])->findOrFail($this->returnId);
        $rows = [];
        foreach ($r->lines as $l) {
            $rows[] = [
                $r->id,
                $r->sale?->number,
                $r->created_at?->toDateTimeString(),
                $r->currency_code,
                (float)$r->total_refund,
                (float)($r->subtotal_refund ?? 0),
                (float)($r->tax_refund ?? 0),
                (float)($r->discount_refund ?? 0),
                (float)($r->cost_refund ?? 0),
                $l->sale_line_id,
                (float)$l->qty,
                (float)($l->subtotal_part ?? 0),
                (float)($l->tax_part ?? 0),
                (float)$l->refund_amount,
                $l->reason,
            ];
        }
        return $rows;
    }
}
