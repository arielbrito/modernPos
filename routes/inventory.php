<?php

use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\ProductController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Inventory\PurchaseController;
use App\Http\Controllers\Inventory\SupplierController;

Route::middleware(['auth'])->prefix('inventory')->name('inventory.')->group(function () {
    Route::resource('products', ProductController::class);
    Route::resource('categories', CategoryController::class);

    Route::get('purchases/search-products', [PurchaseController::class, 'searchProducts'])->name('purchases.searchProducts');

    Route::get('purchases', [PurchaseController::class, 'index'])
        ->name('purchases.index');

    Route::get('purchases/create', [PurchaseController::class, 'create'])
        ->name('purchases.create')
    ;

    Route::get('purchases/{purchase}', [PurchaseController::class, 'show'])
        ->name('purchases.show') // Corregido el nombre a plural por consistencia
    ;


    Route::post('purchases', [PurchaseController::class, 'store'])
        ->name('purchases.store');

    Route::post('purchases/{purchase}/approve', [PurchaseController::class, 'approve'])
        ->name('purchases.approve');

    Route::post('purchases/{purchase}/receive', [PurchaseController::class, 'receive'])
        ->name('purchases.receive');

    Route::post('purchases/{purchase}/payments', [PurchaseController::class, 'storePayment'])
        ->name('purchases.payments.store');

    Route::post('purchases/{purchase}/cancel', [PurchaseController::class, 'cancel'])
        ->name('purchases.cancel');
    Route::resource('suppliers', SupplierController::class);
    // ... otras rutas del módulo
});
