<?php

// database/seeders/CashDenominationSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CashDenomination;

class CashDenominationSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // DOP (orden de mayor a menor para posición)
            ['currency_code' => 'DOP', 'value' => 2000, 'kind' => 'bill', 'position' => 10],
            ['currency_code' => 'DOP', 'value' => 1000, 'kind' => 'bill', 'position' => 9],
            ['currency_code' => 'DOP', 'value' => 500, 'kind' => 'bill', 'position' => 8],
            ['currency_code' => 'DOP', 'value' => 200, 'kind' => 'bill', 'position' => 7],
            ['currency_code' => 'DOP', 'value' => 100, 'kind' => 'bill', 'position' => 6],
            ['currency_code' => 'DOP', 'value' => 50, 'kind' => 'bill', 'position' => 5],
            ['currency_code' => 'DOP', 'value' => 25, 'kind' => 'coin', 'position' => 4],
            ['currency_code' => 'DOP', 'value' => 10, 'kind' => 'coin', 'position' => 3],
            ['currency_code' => 'DOP', 'value' => 5, 'kind' => 'coin', 'position' => 2],
            ['currency_code' => 'DOP', 'value' => 1, 'kind' => 'coin', 'position' => 1],
            ['currency_code' => 'USD', 'value' => 100, 'kind' => 'bill', 'position' => 12],
            ['currency_code' => 'USD', 'value' => 50, 'kind' => 'bill', 'position' => 11],
            ['currency_code' => 'USD', 'value' => 20, 'kind' => 'bill', 'position' => 10],
            ['currency_code' => 'USD', 'value' => 10, 'kind' => 'bill', 'position' => 9],
            ['currency_code' => 'USD', 'value' => 5, 'kind' => 'bill', 'position' => 8],
            ['currency_code' => 'USD', 'value' => 2, 'kind' => 'bill', 'position' => 7],
            ['currency_code' => 'USD', 'value' => 1, 'kind' => 'bill', 'position' => 6],
            ['currency_code' => 'USD', 'value' => 1, 'kind' => 'coin', 'position' => 5],
            ['currency_code' => 'EUR', 'value' => 500, 'kind' => 'bill', 'position' => 15],
            ['currency_code' => 'EUR', 'value' => 200, 'kind' => 'bill', 'position' => 14],
            ['currency_code' => 'EUR', 'value' => 100, 'kind' => 'bill', 'position' => 13],
            ['currency_code' => 'EUR', 'value' => 50, 'kind' => 'bill', 'position' => 12],
            ['currency_code' => 'EUR', 'value' => 20, 'kind' => 'bill', 'position' => 11],
            ['currency_code' => 'EUR', 'value' => 10, 'kind' => 'bill', 'position' => 10],
            ['currency_code' => 'EUR', 'value' => 5, 'kind' => 'bill', 'position' => 9],
            ['currency_code' => 'EUR', 'value' => 2, 'kind' => 'coin', 'position' => 8],
            ['currency_code' => 'EUR', 'value' => 1, 'kind' => 'coin', 'position' => 7],

        ];

        foreach ($rows as $r) {
            CashDenomination::updateOrCreate(
                ['currency_code' => $r['currency_code'], 'value' => $r['value']],
                ['kind' => $r['kind'], 'position' => $r['position'], 'active' => true]
            );
        }
    }
}
