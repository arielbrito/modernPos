<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


// Stock bajo cada 10 minutos
Schedule::call(function () {
    app(\App\Services\Alerts\LowStockAlert::class)->run();
})
    ->everyTenMinutes()
    ->name('low-stock-alert') // <-- AÑADE ESTA LÍNEA
    ->withoutOverlapping()
    ->onOneServer();

// NCF próximos a agotarse cada 15 minutos
Schedule::call(function () {
    app(\App\Services\Alerts\NcfAlert::class)->run();
})
    ->everyFifteenMinutes()
    ->name('ncf-alert') // <-- AÑADE ESTA LÍNEA
    ->withoutOverlapping()
    ->onOneServer();
