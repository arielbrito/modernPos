<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        DB::table('suppliers')->truncate();
        Schema::enableForeignKeyConstraints();

        DB::table('suppliers')->insert([
            [
                'name' => 'Distribuidora Corripio',
                'contact_person' => 'Juan Pérez',
                'phone' => '809-555-1234',
                'email' => 'compras@corripio.com.do',
                'address' => 'Av. John F. Kennedy, Santo Domingo',
                'rnc' => '101000019',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Mercasid',
                'contact_person' => 'Ana Rodríguez',
                'phone' => '809-555-5678',
                'email' => 'ventas@mercasid.com',
                'address' => 'Aut. Duarte Km 14, Santo Domingo Oeste',
                'rnc' => '101000027',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Cervecería Nacional Dominicana (CND)',
                'contact_person' => 'Carlos Gómez',
                'phone' => '809-555-8765',
                'email' => 'pedidos@cnd.com.do',
                'address' => 'Av. Independencia, Santo Domingo',
                'rnc' => '101000035',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Proveedor Local de Pan',
                'contact_person' => 'María Trinidad',
                'phone' => '829-111-2222',
                'email' => 'panaderia_delicia@email.com',
                'address' => 'Calle Central 123, Higüey',
                'rnc' => '130123456',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
