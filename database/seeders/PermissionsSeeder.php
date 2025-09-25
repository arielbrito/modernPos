<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Limpia el caché de permisos/roles
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // ---- Permisos que usa PurchasePolicy ----
        $permissions = [
            //Purchases
            'purchases.view',
            'purchases.create',
            'purchases.approve',
            'purchases.receive',
            'purchases.pay',
            'purchases.cancel',
            'purchases.update',

            //Customers
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',
            //NcfSequences          
            'ncf.manage',
            'ncf.view',
            'ncf.manage', // administrar secuencias
            'ncf.peek',
            'ncf.consume', // endpoints operativos
            'dgii.lookup',
            'registers.view',
            'registers.manage',   // crear/editar/activar/desactivar
            'registers.select',   // elegir caja activa en la sesión

            // Turnos (cash_shifts)
            'cash_shifts.view',
            'cash_shifts.open',
            'cash_shifts.operate',
            'cash_shifts.close',
            'cash_shifts.force_close',

            // Conteos y movimientos (opcionales pero útiles)
            'cash_counts.view',
            'cash_counts.create',
            'cash_movements.view',
            'cash_movements.create',

            //Permisos de ventas
            'sales.view',
            'sales.create',
            'sales.refund',
            'sales.void',
            'sales.price.override',
            'sales.discount.override',
            'dgii.sync.view',
            'dgii.sync.start',
            'dgii.sync.cancel',
            'dgii.sync.download',

            //Gestion de productos
            'products.view',
            'products.create',
            'products.update',
            'products.delete',
            'products.import',
            'categories.view',
            'categories.create',
            'categories.update',
            'categories.delete',

            //Gestion de usuarios y roles
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'permissions.view',
            'permissions.create',
            'permissions.update',
            'permissions.delete',

            //Gestion de tiendas
            'stores.view',
            'stores.create',
            'stores.update',
            'stores.delete',

            //Gestion de proveedores
            'suppliers.view',
            'suppliers.create',
            'suppliers.update',
            'suppliers.delete',
            //Ajustes de inventario
            'inventory_adjustments.view',
            'inventory_adjustments.create',
            'inventory_adjustments.update',
            'inventory_adjustments.delete',

            //devoluciones de compras
            'purchase_returns.view',
            'purchase_returns.create',
            'purchase_returns.approve',

            //devoluciones de ventas
            'sales_returns.view',
            'sales_returns.create',
            'sales_returns.approve',



        ];



        // Crea permisos (idempotente)
        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // ---- Roles base (coinciden con tus policies) ----
        $superAdmin = Role::firstOrCreate(['name' => 'Super-Admin', 'guard_name' => 'web']);
        $manager    = Role::firstOrCreate(['name' => 'Manager', 'guard_name' => 'web']);
        $cashier    = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);

        // Asignar TODOS los permisos de compras a Super-Admin
        $superAdmin->syncPermissions($permissions);

        // Sugerencia inicial (ajústalo si quieres):
        // Manager: casi todo el flujo de compras
        $manager->syncPermissions([
            'purchases.view',
            'purchases.create',
            'purchases.approve',
            'purchases.receive',
            'purchases.pay',
            'purchases.update',
            //Customers
            'customers.view',
            'customers.create',
            'customers.update',
            //NcfSequences
            'ncf.manage',
            'ncf.consume',
            'ncf.view',
            'ncf.peek',
            'dgii.lookup',
            'sales.view',
            'sales.create',
            'sales.refund',
            'sales.void',
            'sales.price.override',
            'sales.discount.override',


        ]);

        // Cashier: solo consulta (y eventualmente pagos si así lo decides)
        $cashier->syncPermissions([
            'purchases.view',
            // 'purchases.pay', // <- descomenta si quieres permitir pagos al cajero
            'customers.view',
            'sales.view',
            'sales.create',
            'cash_shifts.view',
            'cash_shifts.open',
            'cash_shifts.operate',
            'cash_shifts.close',
            'cash_counts.view',
            'cash_counts.create',
            'cash_movements.view',
            'cash_movements.create',
        ]);

        // (Opcional) si quieres garantizar que un usuario tenga el rol Super-Admin por ENV:
        // Pon en tu .env: SUPERADMIN_EMAIL=admin@tudominio.com
        User::role('Super-Admin')->get()->each(function ($user) use ($superAdmin) {
            $user->syncRoles([$superAdmin]);
        });

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
