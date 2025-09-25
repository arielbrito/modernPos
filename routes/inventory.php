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
        // ->middleware(['auth', 'verified']) // Buen lugar para middleware general
        ->group(function () {

            // --- Rutas de Colección (no dependen de una compra específica) ---
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('/search-products', 'searchProducts')->name('searchProducts');

            // --- Rutas de Miembro (aplican a una compra específica) ---
            Route::prefix('{purchase}')->group(function () {
                Route::get('/', 'show')->name('show');

                // CORRECCIÓN: Movimos edit y update aquí dentro, donde pertenecen.
                // Sus URIs y nombres ahora son mucho más simples y consistentes.
                Route::get('/edit', 'edit')->name('edit')->middleware('can:update,purchase');
                Route::put('/', 'update')->name('update')->middleware('can:update,purchase');

                // Acciones sobre la compra
                Route::post('/approve', 'approve')->name('approve');
                Route::post('/receive', 'receive')->name('receive');
                Route::post('/cancel', 'cancel')->name('cancel');

                Route::post('/returns', [PurchaseReturnController::class, 'store'])->name('returns.store')->middleware('permission:purchase_returns.create');

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

//Rutas de devoluciones de compra
Route::controller(PurchaseReturnController::class)->prefix('purchase-returns')->name('purchaseReturns.')->group(function () {
    Route::get('/', 'index')->name('index')->middleware('permission:purchase_returns.view');
    // Route::get('/{purchaseReturn}', 'show')->name('show');
    // Route::post('/{purchaseReturn}/approve', 'approve')->name('approve');
    // Route::post('/{purchaseReturn}/cancel', 'cancel')->name('cancel');
});

// Rutas para Ajustes de Inventario
Route::controller(InventoryAdjustmentController::class)
    ->prefix('inventory/adjustments')
    ->name('inventory.adjustments.')
    // ->middleware(['auth', 'verified']) // Un buen lugar para añadir la seguridad
    ->group(function () {

        Route::get('/', 'index')->name('index'); // Para el listado de ajustes (futuro)
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        //Route::get('/{adjustment}', 'show')->name('show'); // Para ver un ajuste específico (futuro)

        Route::get('/bulk-adjust',  'bulkCreate')
            ->name('bulkCreate')
            ->middleware('permission:inventory_adjustments.create');

        Route::post('bulk-adjust',  'bulkStore')
            ->name('bulkStore')
            ->middleware('permission:inventory_adjustments.create');
    });

    // ...

// We'll also need a route to store the bulk adjustment
