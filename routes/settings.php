<?php

use App\Http\Controllers\Notifications\AlertSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\StoreController;
use App\Http\Controllers\Settings\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::resource('users', UserController::class);

    Route::post(
        'users/{user}/verification-notification',
        [UserController::class, 'resendVerification']
    )
        ->name('users.verification.send')
        ->middleware('throttle:6,1'); // evita spam

    Route::resource('stores', StoreController::class)
        ->only(['index', 'show', 'create', 'store', 'destroy', 'edit', 'update']);

    Route::resource('settings/roles', RoleController::class);


    Route::get('alerts/settings', [AlertSettingController::class, 'edit'])->name('alerts.settings.edit')->middleware('permissions:settings');
    Route::get('alerts/settings', [AlertSettingController::class, 'update'])->name('alerts.settings.update')->middleware('permissions:settings');
});
