<?php

use App\Http\Controllers\Sales\SaleController;
use App\Http\Controllers\Sales\SaleExportController;
use App\Http\Controllers\Sales\SalePrintController;
use App\Http\Controllers\Sales\SaleReturnController;
use Illuminate\Support\Facades\Route;



//ventas
Route::post('/sales/preview', [SaleController::class, 'preview'])->name('sales.preview');
Route::post('/sales', [SaleController::class, 'store'])->name('sales.store');
Route::get('/sales',  [SaleController::class, 'index'])->name('sales.index'); // opcional
Route::get('/sales/{sale}', [SaleController::class, 'show'])->name('sales.show'); // opcional
Route::post('/sales/returns', [SaleReturnController::class, 'store'])
    ->name('sales.returns.store');

Route::get('/sales/{sale}/pdf', [SalePrintController::class, 'pdf'])
    ->name('sales.pdf');

Route::get('/sales/{sale}/print', [SalePrintController::class, 'print'])
    ->name('sales.print');

Route::get('/sales/export/csv',  [SaleExportController::class, 'csv'])->name('sales.export.csv');
Route::get('/sales/export/xlsx', [SaleExportController::class, 'xlsx'])->name('sales.export.xlsx');
