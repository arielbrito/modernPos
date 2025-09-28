<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserAlertSetting;

class UserAlertSettingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (User::cursor() as $u) {
            UserAlertSetting::firstOrCreate(
                ['user_id' => $u->id],
                [
                    'low_stock_enabled' => true,
                    'low_stock_channels' => ['database'], // prod: ['database','mail']
                    'ncf_enabled' => true,
                    'ncf_channels' => ['database'],
                ]
            );
        }
    }
}
