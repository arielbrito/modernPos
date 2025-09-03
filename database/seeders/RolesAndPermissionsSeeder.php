<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Crear el rol de Super Administrador
        // Este rol tendrá acceso a todo gracias al Gate::before en AuthServiceProvider
        Role::create(['name' => 'Super-Admin']);

        // Crear otros roles que necesitarás
        Role::create(['name' => 'Administrador']);
        Role::create(['name' => 'Cajero']);
        Role::create(['name' => 'Gerente de Tienda']);

        // Aquí podrías crear permisos específicos en el futuro, por ejemplo:
        // Permission::create(['name' => 'edit articles']);
    }
}
