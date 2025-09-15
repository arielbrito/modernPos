<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class AlertsRunLowStock extends Command
{
    protected $signature = 'alerts:low-stock';
    protected $description = 'Enviar alertas de stock bajo';

    public function handle(): int
    {
        app(\App\Services\Alerts\LowStockAlert::class)->run();
        $this->info('Low stock alerts dispatched.');
        return self::SUCCESS;
    }
}
