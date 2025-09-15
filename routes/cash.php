<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Cash\CashShiftController;
use App\Http\Controllers\Cash\CashMovementController;
use App\Http\Controllers\Cash\CashShiftReportController;
use App\Http\Controllers\Cash\RegisterController;

/*Todas la rutas concernientes a caja*/
//Ruta gestion
Route::get('/cash/registers', [RegisterController::class, 'index'])->name('cash.registers.index');
Route::post('/cash/registers', [RegisterController::class, 'store'])->name('cash.registers.store');
Route::put('/cash/registers/{register}', [RegisterController::class, 'update'])->name('cash.registers.update');
Route::delete('/cash/registers/{register}', [RegisterController::class, 'destroy'])->name('cash.registers.destroy');


// Link del sidebar: resuelve caja activa o envía a selector
Route::get('/cash/cashbook', [RegisterController::class, 'cashbookActive'])
    ->name('cash.cashbook');

// Página de selección de caja
Route::get('/cash/registers/select', [RegisterController::class, 'select'])
    ->name('cash.registers.select');

// Setear caja activa
Route::post('/cash/registers/{register}/set-active', [RegisterController::class, 'setActive'])
    ->name('cash.registers.set-active');

// Limpiar caja activa (opcional)
Route::post('/cash/registers/clear-active', [RegisterController::class, 'clearActive'])
    ->name('cash.registers.clear-active');




Route::post('/cash/registers/{register}/toggle', [RegisterController::class, 'toggle'])->name('cash.registers.toggle');
Route::get('/cash/registers/{register}/cashbook', [RegisterController::class, 'cashbook'])
    ->name('cash.registers.cashbook.show');

Route::get('{register}/shift/open', [RegisterController::class, 'openShiftForm'])
    ->name('shift.open.form');

// Página (form) para cerrar turno
Route::get('shifts/{shift}/close', [RegisterController::class, 'closeShiftForm'])
    ->name('cash.shifts.close.form');

Route::get('/cash/shifts/{shift}/report', [CashShiftReportController::class, 'show'])
    ->name('cash.shifts.report');

Route::get('/cash/shifts/{shift}/report/export', [CashShiftReportController::class, 'export'])
    ->name('cash.shifts.report.export');


Route::post('/cash/registers/{register}/shift/open', [CashShiftController::class, 'open'])
    ->name('cash.registers.shift.open');
Route::post('/cash/shifts/{shift}/close', [CashShiftController::class, 'close'])->name('cash.shifts.close');
Route::get('/cash/shifts/current', [CashShiftController::class, 'current'])->name('cash.shifts.current');

Route::post('/cash/movements', [CashMovementController::class, 'store'])->name('cash.movements.store');
