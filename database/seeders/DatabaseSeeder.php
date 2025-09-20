<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role; // <-- Importar el modelo Role

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionsSeeder::class,
            NcfSequencesSeeder::class,
            DefaultCustomersSeeder::class,
            CategorySeeder::class,
            SupplierSeeder::class,
            ProductSeeder::class,
            CurrencySeeder::class,
            CashDenominationSeeder::class,
            RegisterSeeder::class,
        ]);

        // 2. Crear una tienda principal
        $mainStore = Store::firstOrCreate(
            ['code' => 'MAIN'],
            ['name' => 'The Coffee Stop', 'rnc' => '00100000000', 'is_active' => true]
        );

        // 3. Crear el usuario Super-Admin
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@modernpos.com'],
            ['name' => 'Super Admin', 'password' => Hash::make('Joker@7890')],
            ['email_verified_at' => now()]
        );

        $superAdmin->forceFill(['email_verified_at' => now()])->save();


        // 4. Obtener el rol de Super-Admin
        $superAdminRole = Role::where('name', 'Super-Admin')->first();

        // 5. Asignar el rol global al usuario
        $superAdmin->assignRole($superAdminRole);

        // 6. Asignar la tienda principal al Super-Admin CON SU ROL ESPECÍFICO
        // Usamos una sintaxis de array asociativo para pasar datos adicionales a la tabla pivote
        $superAdmin->stores()->sync([
            $mainStore->id => ['role_id' => $superAdminRole->id]
        ]);


        // 1. Ejecutar el seeder de roles y permisos

    }
}
