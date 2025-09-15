<?php

use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\ProductStockController;
use App\Http\Controllers\Inventory\PurchaseController;
use App\Http\Controllers\Inventory\SupplierController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Módulo de Inventario
|--------------------------------------------------------------------------
|
| Todas las rutas relacionadas con la gestión de inventario, productos,
| compras y suplidores.
|
*/

Route::middleware(['auth'])->prefix('inventory')->name('inventory.')->group(function () {

    // --- Productos y Variantes ---
    Route::resource('products', ProductController::class);

    // Rutas específicas para un producto (acciones adicionales)
    Route::controller(ProductController::class)->prefix('products/{product}')->name('products.')->group(function () {
        Route::get('movements/export', 'exportMovements')->name('movements.export');
        Route::get('stock-timeseries', 'stockTimeseries')->name('stockTimeseries');
    });

    // Rutas para Variantes (ajustes de inventario)
    Route::post('variants/{variant}/adjust', [ProductStockController::class, 'adjust'])
        ->name('variants.adjust');


    // --- Categorías ---
    Route::resource('categories', CategoryController::class);


    // --- Suplidores ---
    Route::resource('suppliers', SupplierController::class);


    // --- Compras ---
    Route::controller(PurchaseController::class)->prefix('purchases')->name('purchases.')->group(function () {
        // Rutas de colección (no dependen de una compra específica)
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/search-products', 'searchProducts')->name('searchProducts');

        // Rutas de miembro (aplican a una compra específica)
        Route::prefix('{purchase}')->group(function () {
            Route::get('/', 'show')->name('show');
            Route::post('/approve', 'approve')->name('approve');
            Route::post('/receive', 'receive')->name('receive');
            Route::post('/cancel', 'cancel')->name('cancel');

            // Pagos de la compra
            Route::post('/payments', 'storePayment')->name('payments.store');

            // Archivos adjuntos de la compra
            Route::prefix('attachments')->name('attachments.')->group(function () {
                Route::post('/', 'uploadAttachment')->name('upload');
                Route::get('/{attachment}', 'downloadAttachment')->name('download');
                Route::delete('/{attachment}', 'destroyAttachment')->name('destroy');
            });
        });
    });
});
