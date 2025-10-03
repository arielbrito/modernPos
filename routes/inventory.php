<?php

use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\InventoryAdjustmentController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\ProductStockController;
use App\Http\Controllers\Inventory\PurchaseController;
use App\Http\Controllers\Inventory\PurchaseReturnController;
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


    Route::get('/products/search', [ProductController::class, 'search'])
        ->name('products.search');

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
    Route::controller(PurchaseController::class)
        ->prefix('purchases')
        ->name('purchases.')
        ->group(function () {

            // Colección
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/search-products', 'searchProducts')->name('searchProducts');

            // Miembro
            Route::prefix('{purchase}')->group(function () {
                Route::get('/', 'show')->name('show');

                Route::get('/edit', 'edit')->name('edit')->middleware('can:update,purchase');
                Route::put('/', 'update')->name('update')->middleware('can:update,purchase');

                Route::post('/approve', 'approve')->name('approve');
                Route::post('/receive', 'receive')->name('receive');
                // Route::get('/receive', 'receiveForm')->name('receiveForm'); // <-- AÑADIDO

                Route::post('/cancel', 'cancel')->name('cancel');

                Route::get('/print', 'print')->name('print'); // <-- AÑADIDO

                Route::post('/payments', 'storePayment')->name('payments.store');

                Route::prefix('attachments')->name('attachments.')->group(function () {
                    Route::post('/', 'uploadAttachment')->name('upload');
                    Route::get('/{attachment}', 'downloadAttachment')->name('download');
                    Route::delete('/{attachment}', 'destroyAttachment')->name('destroy');
                });
            });
        });
});

//Rutas de devoluciones de compra
Route::controller(PurchaseReturnController::class)
    ->prefix('purchases/returns')
    ->name('purchases.returns.')
    ->middleware('permission:purchase_returns.view')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');

        // helpers para el form
        Route::get('/search-purchases', 'searchPurchases')->name('searchPurchases');
        Route::get('/{purchase}/returnable-items', 'returnableItems')->name('returnableItems');

        Route::get('/{return}', 'show')->name('show');
        Route::get('/{return}/print', 'print')->name('print'); // ?paper=a4|letter&copy=1&download=1
    });

// Rutas para Ajustes de Inventario
Route::controller(InventoryAdjustmentController::class)
    ->prefix('inventory/adjustments')
    ->name('inventory.adjustments.')
    // ->middleware(['auth', 'verified'])
    ->group(function () {

        // -- Index/Listado
        Route::get('/', 'index')->name('index');

        // -- Crear (simple)
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');

        // -- Crear (masivo / conteo)
        Route::get('/bulk-adjust', 'bulkCreate')
            ->name('bulkCreate')
            ->middleware('permission:inventory_adjustments.create');

        Route::post('/bulk-adjust', 'bulkStore')
            ->name('bulkStore')
            ->middleware('permission:inventory_adjustments.create');

        // -- Dinámicas (SIEMPRE al final) + constraint numérico
        Route::get('/{adjustment}', 'show')
            ->whereNumber('adjustment')
            ->name('show');

        Route::get('/{adjustment}/print', 'print')
            ->whereNumber('adjustment')
            ->name('print');
    });

    // ...

// We'll also need a route to store the bulk adjustment
