<?php

// database/seeders/RegisterSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\{Store, Register};

class RegisterSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Store::all() as $store) {
            Register::firstOrCreate(
                ['store_id' => $store->id, 'name' => 'Caja 1'],
                ['active' => true]
            );
        }
    }
}
