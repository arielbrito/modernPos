<?php

use App\Http\Controllers\Notifications\AlertSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\ReceiptSettingController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\StoreController;
use App\Http\Controllers\Settings\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {

    // Redirección principal para la sección de configuración.
    Route::redirect('/settings', '/settings/profile');

    // --- GRUPO DE RUTAS DE CONFIGURACIÓN ---
    // Agrupamos todas las rutas que comienzan con /settings
    Route::prefix('settings')->name('settings.')->group(function () {

        // Perfil de Usuario
        Route::controller(ProfileController::class)->group(function () {
            Route::get('/profile', 'edit')->name('profile.edit');
            Route::patch('/profile', 'update')->name('profile.update');
            Route::delete('/profile', 'destroy')->name('profile.destroy');
        });

        // Contraseña
        Route::controller(PasswordController::class)->group(function () {
            Route::get('/password', 'edit')->name('password.edit');
            Route::put('/password', 'update')->middleware('throttle:6,1')->name('password.update');
        });

        // Apariencia
        Route::get('/appearance', function () {
            return Inertia::render('settings/appearance');
        })->name('appearance');

        // Configuración de Alertas (Corregido y Reubicado por consistencia)
        Route::controller(AlertSettingController::class)->middleware('permission:settings.view')->group(function () {
            Route::get('/alerts', 'edit')->name('alerts.edit');
            Route::put('/alerts', 'update')->name('alerts.update');
            Route::post('/alerts/test', 'test')->name('alerts.test');
        });

        // Roles
        Route::resource('roles', RoleController::class);

        //Configuracion del ticket 
        Route::controller(ReceiptSettingController::class)->middleware('permission:settings.view')->group(function () {
            Route::get('/receipts', 'edit')->name('receipts.edit');
            Route::put('/receipts', 'update')->name('receipts.update');
        });
    });

    // --- GESTIÓN DE LA APLICACIÓN ---

    // Gestión de Usuarios
    Route::resource('users', UserController::class);
    Route::post('users/{user}/verification-notification', [UserController::class, 'resendVerification'])
        ->middleware('throttle:6,1')
        ->name('users.verification.send');

    // Gestión de Tiendas
    // El método ->only(...) es redundante si incluye todas las acciones, por lo que se elimina.
    Route::resource('stores', StoreController::class);
});
