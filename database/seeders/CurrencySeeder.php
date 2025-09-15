<?php

// database/seeders/CurrencySeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('currencies')->upsert([
            ['code' => 'DOP', 'name' => 'Dominican Peso', 'symbol' => '$', 'minor_unit' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => 'US$', 'minor_unit' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'minor_unit' => 2, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'symbol', 'minor_unit', 'updated_at']);
    }
}
