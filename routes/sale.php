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
        Route::post('/returns', [SaleReturnController::class, 'store'])->name('returns.store');

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
