<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Store;

class NcfSequencesSeeder extends Seeder
{
    public function run(): void
    {
        // Tipos base (ya seed-eados en migración): B02 (Consumidor Final), B01 (Crédito Fiscal)
        $types = [
            ['code' => 'B02', 'prefix' => 'B02', 'pad_length' => 8],
            ['code' => 'B01', 'prefix' => 'B01', 'pad_length' => 8],
        ];

        $stores = Store::query()->get(['id']);

        if ($stores->isEmpty()) {
            $this->command?->warn('No hay tiendas. Crea al menos una tienda antes de ejecutar NcfSequencesSeeder.');
            return;
        }

        foreach ($stores as $store) {
            foreach ($types as $t) {
                DB::table('ncf_sequences')->updateOrInsert(
                    ['store_id' => $store->id, 'ncf_type_code' => $t['code']],
                    [
                        'prefix'      => $t['prefix'],
                        'next_number' => 1,
                        'end_number'  => null,
                        'pad_length'  => $t['pad_length'],
                        'active'      => true,
                        'updated_at'  => now(),
                        'created_at'  => now(),
                    ]
                );
            }
        }
    }
}
