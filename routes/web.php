<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\POS\PosController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
    Route::get('/pos/search-products', [PosController::class, 'searchProducts'])->name('pos.searchProducts');
    Route::post('/pos/sales', [PosController::class, 'storeSale'])->name('pos.storeSale');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/inventory.php';
