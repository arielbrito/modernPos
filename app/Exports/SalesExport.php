<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SalesExport implements FromQuery, WithHeadings, WithMapping, WithColumnFormatting, WithStyles, WithColumnWidths
{
    public function __construct(protected Builder $query) {}

    public function query()
    {
        return $this->query;
    }

    public function headings(): array
    {
        return [
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
        ];
    }

    public function map($s): array
    {
        return [
            optional($s->occurred_at)->format('Y-m-d H:i:s'),
            $s->number,
            $s->ncf_type,
            $s->ncf_number,
            $s->bill_to_name,
            $s->bill_to_doc_type === 'NONE' ? '' : trim(($s->bill_to_doc_type ?? '') . ' ' . ($s->bill_to_doc_number ?? '')),
            $s->bill_to_is_taxpayer ? 'Sí' : 'No',
            (float)$s->subtotal,
            (float)$s->discount_total,
            (float)$s->tax_total,
            (float)$s->total,
            (float)$s->paid_total,
            (float)$s->due_total,
            $s->status,
            $s->store?->code,
        ];
    }

    public function columnFormats(): array
    {
        return [
            'H' => NumberFormat::FORMAT_NUMBER_00,
            'I' => NumberFormat::FORMAT_NUMBER_00,
            'J' => NumberFormat::FORMAT_NUMBER_00,
            'K' => NumberFormat::FORMAT_NUMBER_00,
            'L' => NumberFormat::FORMAT_NUMBER_00,
            'M' => NumberFormat::FORMAT_NUMBER_00,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle('A1:O1')->getFont()->setBold(true);
        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 18,
            'C' => 10,
            'D' => 18,
            'E' => 28,
            'F' => 20,
            'G' => 14,
            'H' => 14,
            'I' => 14,
            'J' => 14,
            'K' => 14,
            'L' => 14,
            'M' => 14,
            'N' => 12,
            'O' => 12,
        ];
    }
}
