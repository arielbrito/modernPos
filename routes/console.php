<?php

use App\Services\Alerts\LowStockAlert;
use App\Services\Alerts\NcfAlert;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


Schedule::call(function () {
    app(LowStockAlert::class)->run();
})
    ->everyTwoHours() // <-- CAMBIO: De everyTenSeconds() a una frecuencia razonable
    ->name('low-stock-alert')
    ->withoutOverlapping()
    ->onOneServer();

// NCF próximos a agotarse cada 2 horas
Schedule::call(function () {
    app(NcfAlert::class)->run();
})
    ->everyTwoHours() // <-- CAMBIO: De everyTenSeconds() a una frecuencia razonable
    ->name('ncf-alert')
    ->withoutOverlapping()
    ->onOneServer();
