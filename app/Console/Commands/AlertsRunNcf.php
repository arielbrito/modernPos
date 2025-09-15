<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class AlertsRunNcf extends Command
{
    protected $signature = 'alerts:ncf';
    protected $description = 'Enviar alertas de NCF por agotarse';

    public function handle(): int
    {
        app(\App\Services\Alerts\NcfAlert::class)->run();
        $this->info('NCF alerts dispatched.');
        return self::SUCCESS;
    }
}
