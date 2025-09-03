<?php

use App\Http\Controllers\Auth\StoreSessionController;
use App\Http\Controllers\POS\PosController;
use App\Http\Middleware\EnsureStoreIsSelected;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// --- Rutas Públicas ---
Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');


// --- Rutas para Usuarios Autenticados ---
Route::middleware(['auth', 'verified'])->group(function () {

    // --- Nivel 1: Solo requiere autenticación ---
    // Aquí van las rutas para seleccionar la tienda. No usan el middleware EnsureStoreIsSelected.
    Route::get('/select-store', [StoreSessionController::class, 'create'])->name('store.selector');
    Route::post('/select-store', [StoreSessionController::class, 'store'])->name('store.select');
    Route::post('/switch-store', [StoreSessionController::class, 'store'])->name('store.switch');


    // --- Nivel 2: Requiere autenticación Y una tienda seleccionada ---
    // Este grupo protege el núcleo de tu aplicación.
    Route::middleware(EnsureStoreIsSelected::class)->group(function () {

        Route::get('dashboard', function () {
            return Inertia::render('dashboard');
        })->name('dashboard');

        // Rutas del POS
        Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
        Route::get('/pos/search-products', [PosController::class, 'searchProducts'])->name('pos.searchProducts');
        Route::post('/pos/sales', [PosController::class, 'storeSale'])->name('pos.storeSale');

        // Aquí también irían los "require" de tus otros archivos de rutas
        // que deben estar protegidos por este middleware.
        require __DIR__ . '/inventory.php';
        require __DIR__ . '/settings.php';
    });
});


// Este archivo generalmente contiene las rutas de login, registro, etc.
// que no necesitan autenticación.
require __DIR__ . '/auth.php';
