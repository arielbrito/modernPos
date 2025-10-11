<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Sales\SaleController;
use App\Http\Controllers\Sales\SaleExportController;
use App\Http\Controllers\Sales\SalePrintController;
use App\Http\Controllers\Sales\SaleReturnController;

// 💡 Sugerido: agrupa bajo /sales con alias sales.*
Route::prefix('sales')
    ->as('sales.')
    ->group(function () {

        // --- Acciones generales ---
        Route::get('/', [SaleController::class, 'index'])->name('index');           // opcional (lista)
        Route::post('/', [SaleController::class, 'store'])->name('store');          // crear venta
        Route::post('/preview', [SaleController::class, 'preview'])->name('preview');


        // --- Devoluciones ---

        // Vista para iniciar una devolución desde el detalle de una venta
        Route::get('/returns', [SaleReturnController::class, 'index'])->name('returns.index');
        Route::get('/{sale}/returns/new', [SaleReturnController::class, 'create'])
            ->name('returns.create');
        Route::post('/returns', [SaleReturnController::class, 'store'])->name('returns.store');

        Route::get('/returns/find', [SaleReturnController::class, 'findSale'])
            ->name('returns.find');
        Route::get('/returns/{saleReturn}', [SaleReturnController::class, 'show'])
            ->name('returns.show');

        // Export del comprobante individual
        Route::get('/returns/{saleReturn}/pdf', [SaleReturnController::class, 'pdf'])
            ->name('returns.pdf');
        Route::get('/returns/{saleReturn}/excel', [SaleReturnController::class, 'excel'])
            ->name('returns.excel');

        // (Opcional) Export del listado filtrado
        Route::get('/returns-export', [SaleReturnController::class, 'exportListExcel'])
            ->name('returns.exportList');

        // --- Exportaciones (definir ANTES de {sale}) ---
        Route::get('/export/csv',  [SaleExportController::class, 'csv'])->name('export.csv');
        Route::get('/export/xlsx', [SaleExportController::class, 'xlsx'])->name('export.xlsx');

        // --- Impresión / PDF (por venta) ---
        Route::get('/{sale}/print', [SalePrintController::class, 'print'])->name('print');
        Route::get('/{sale}/pdf',   [SalePrintController::class, 'pdf'])->name('pdf');

        // --- Recibo visual separado del show para evitar colisión ---
        Route::get('/{sale}/receipt', [SaleController::class, 'receipt'])->name('receipt');

        // --- Show (JSON o vista detallada) ---
        Route::get('/{sale}', [SaleController::class, 'show'])
            ->whereNumber('sale')
            ->name('show'); // opcional
    });
