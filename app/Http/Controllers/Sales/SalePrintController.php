<?php

// app/Http/Controllers/Sales/SalePrintController.php
// app/Http/Controllers/Sales/SalePrintController.php
namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class SalePrintController extends Controller
{
    // app/Http/Controllers/Sales/SalePrintController.php
    public function print(Sale $sale)
    {
        $sale->load(['store', 'lines', 'payments', 'user:id,name', 'register:id,name']);
        return Inertia::render('sales/print', ['sale' => $sale]);
    }



    public function pdf(Request $request, Sale $sale)
    {
        $sale->load([
            'store:id,code,name,rnc,phone,address',
            'register:id,name',
            'user:id,name',
            'lines:id,sale_id,sku,name,qty,unit_price,discount_percent,discount_amount,tax_rate,tax_amount,total_ex_tax,line_total',
            'payments:id,sale_id,method,amount,currency_code,fx_rate_to_sale,tendered_amount,change_amount,change_currency_code,reference,meta,created_at',
        ]);

        $pdf = Pdf::loadView('pdf.sales.detail', ['sale' => $sale])
            ->setPaper('letter', 'portrait'); // o ->setPaper('a4','portrait')

        // ?download=1 para descargar; si no, abre en el navegador
        return $request->boolean('download')
            ? $pdf->download("venta-{$sale->number}.pdf")
            : $pdf->stream("venta-{$sale->number}.pdf");
    }
}
