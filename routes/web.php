<?php

use App\Http\Controllers\Auth\StoreSessionController;
use App\Http\Controllers\CRM\CustomerController;
use App\Http\Controllers\CRM\DgiiLookupController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Fiscal\NcfApiController;
use App\Http\Controllers\Fiscal\NcfSequenceController;
use App\Http\Controllers\Notifications\NotificationController;
use App\Http\Controllers\POS\PosController;
use App\Http\Controllers\Fiscal\DgiiSyncController;
use App\Http\Controllers\CRM\CustomerPaymentController;


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

// routes/web.php


Route::middleware(['auth', 'verified'])
    ->prefix('admin')
    ->as('admin.')
    ->group(function () {

        Route::prefix('dgii-sync')->name('dgii-sync.')->group(function () {

            Route::get('/', [DgiiSyncController::class, 'create'])
                ->middleware('permission:dgii.sync.view')
                ->name('create');

            Route::post('/', [DgiiSyncController::class, 'store'])
                ->middleware('permission:dgii.sync.start')
                ->name('store');

            Route::get('/status', [DgiiSyncController::class, 'status'])
                ->middleware(['permission:dgii.sync.view', 'throttle:dgii-status'])
                ->name('status');

            Route::post('/cancel', [DgiiSyncController::class, 'cancel'])
                ->middleware(['permission:dgii.sync.cancel'])
                ->name('cancel');

            Route::get('/download-original', [DgiiSyncController::class, 'downloadOriginal'])
                ->middleware(['permission:dgii.sync.download'])
                ->name('download-original');
        });
    });



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

        Route::get('/dashboard', [DashboardController::class, 'index'])

            ->name('dashboard');

        // Rutas del POS
        Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
        Route::get('/pos/search-products', [PosController::class, 'searchProducts'])->name('pos.searchProducts');
        Route::post('/pos/sales', [PosController::class, 'storeSale'])->name('pos.storeSale');

        //Rutas de Customers


        Route::get('crm/customers/quick-search', [CustomerController::class, 'quickSearch'])
            ->name('crm.customers.quick_search');
        Route::get('/dgii/find', [DgiiLookupController::class, 'find'])->name('dgii.find')->middleware('throttle:30,1');
        Route::resource('crm/customers', CustomerController::class);
        Route::get('crm/customers-export', [CustomerController::class, 'export'])
            ->name('crm.customers.export');
        //Rutas para el manejo de pagos de clientes

        Route::post('/customers/{customer}/payments', [CustomerPaymentController::class, 'store'])
            ->name('customers.payments.store');



        //Rutas para el manejo de NCF
        Route::get('/fiscal/ncf-sequences', [NcfSequenceController::class, 'index'])->name('fiscal.ncf.index');
        Route::post('/fiscal/ncf-sequences', [NcfSequenceController::class, 'store'])->name('fiscal.ncf.store');
        Route::put('/fiscal/ncf-sequences/{sequence}', [NcfSequenceController::class, 'update'])->name('fiscal.ncf.update');
        Route::delete('/fiscal/ncf-sequences/{sequence}', [NcfSequenceController::class, 'destroy'])->name('fiscal.ncf.destroy');

        // API operativa
        Route::get('/api/ncf/preview', [NcfApiController::class, 'preview'])->name('api.ncf.preview');
        Route::get('/api/ncf/default-type', [NcfApiController::class, 'defaultType'])->name('api.ncf.default');
        Route::post('/api/ncf/consume', [NcfApiController::class, 'consume'])->name('api.ncf.consume');

        Route::get('/notifications', [NotificationController::class, 'index'])
            ->name('notifications.index');

        // JSON para la campana (dropdown)
        Route::get('/notifications/dropdown', [NotificationController::class, 'dropdown'])
            ->name('notifications.dropdown');

        // Marcar todas como leídas
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])
            ->name('notifications.mark-all');

        // Marcar una como leída
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])
            ->name('notifications.mark');

        // Eliminar una
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])
            ->name('notifications.destroy');









        // Aquí también irían los "require" de tus otros archivos de rutas
        // que deben estar protegidos por este middleware.
        require __DIR__ . '/cash.php';
        require __DIR__ . '/sale.php';
        require __DIR__ . '/inventory.php';
        require __DIR__ . '/settings.php';
    });
});


// Este archivo generalmente contiene las rutas de login, registro, etc.
// que no necesitan autenticación.
require __DIR__ . '/auth.php';
