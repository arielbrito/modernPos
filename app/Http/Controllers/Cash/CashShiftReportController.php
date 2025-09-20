<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Services\Cash\ShiftReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CashShiftReportController extends Controller
{
    public function show(CashShift $shift, ShiftReportService $svc)
    {
        $this->authorize('view', $shift); // si tienes policies; opcional

        $report = $svc->build($shift->id);

        return Inertia::render('cash/shifts/report', [
            'report' => $report,
        ]);
    }

    public function print(CashShift $shift, ShiftReportService $svc)
    {
        $this->authorize('view', $shift);

        // Reutilizamos el mismo servicio para construir el reporte
        $report = $svc->build($shift->id);

        // Renderizamos una vista de Inertia diferente, diseñada para imprimir
        return Inertia::render('cash/shifts/Print', [
            'report' => $report,
        ]);
    }

    public function export(CashShift $shift, ShiftReportService $svc): StreamedResponse
    {
        $rows = $svc->paymentsFlat($shift->id);

        $filename = sprintf('shift-%d-payments.csv', $shift->id);

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Date/Time',
                'Sale #',
                'Customer',
                'Method',
                'Pay CCY',
                'Amount',
                'FX to sale',
                'Amount in sale ccy',
                'Tendered',
                'Change',
                'Change CCY'
            ]);

            foreach ($rows as $r) {
                $eq = $r->currency_code === $r->sale_currency
                    ? (float)$r->amount
                    : round((float)$r->amount * (float)($r->fx_rate_to_sale ?? 0), 2);

                fputcsv($out, [
                    $r->occurred_at,
                    $r->sale_number,
                    $r->customer,
                    $r->method,
                    $r->currency_code,
                    number_format((float)$r->amount, 2, '.', ''),
                    $r->fx_rate_to_sale ?? '',
                    number_format($eq, 2, '.', ''),
                    $r->tendered_amount ?? '',
                    $r->change_amount ?? '',
                    $r->change_currency_code ?? '',
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
