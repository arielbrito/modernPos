<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;

class DefaultCustomersSeeder extends Seeder
{
    public function run(): void
    {
        Customer::firstOrCreate(
            ['code' => 'CUST-000000'],
            [
                'name'              => 'Consumidor Final',
                'kind'              => 'person',
                'document_type'     => 'NONE',
                'document_number'   => null,
                'email'             => null,
                'phone'             => null,
                'address'           => null,
                'is_taxpayer'       => false,
                'active'            => true,
                'allow_credit'      => false,
                'credit_limit'      => 0,
                'credit_terms_days' => 0,
                'balance'           => 0,
            ]
        );
    }
}
