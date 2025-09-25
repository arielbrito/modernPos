<?php

namespace App\Services\Alerts;

use App\Models\Inventory;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use App\Notifications\LowStockNotification;
use Illuminate\Support\Facades\Schema;

class LowStockAlert
{
    public function run(): void
    {
        // 1. Iteramos sobre cada tienda activa en el sistema.
        $stores = Store::where('is_active', true)->get();

        foreach ($stores as $store) {
            $threshold = (int) config('pos.alerts.low_stock_threshold', 3);

            // 2. Ejecutamos la consulta de stock bajo para CADA tienda.
            $lowStockRows = ProductVariant::query()
                ->with(['product:id,name'])
                ->where('is_active', true)
                ->whereHas('product', fn($q) => $q->where('product_nature', 'stockable'))
                // Condición A: El producto TIENE inventario en esta tienda, pero la cantidad es baja.
                ->where(function ($query) use ($store, $threshold) {
                    $query->whereHas('inventory', function ($subQuery) use ($store, $threshold) {
                        $subQuery->where('store_id', $store->id)
                            ->where('quantity', '<=', $threshold);
                    })
                        // Condición B: O el producto simplemente NO TIENE NINGÚN registro de inventario en esta tienda.
                        ->orWhereDoesntHave('inventory', function ($subQuery) use ($store) {
                            $subQuery->where('store_id', $store->id);
                        });
                })
                ->get(); // Usamos get() aquí, ya que la consulta es por tienda y no debería ser masiva.

            if ($lowStockRows->isEmpty()) {
                continue; // Si no hay nada que reportar en esta tienda, pasamos a la siguiente.
            }

            // 3. Buscamos los destinatarios para ESTA tienda.
            $recipients = $this->recipientsForStore($store->id);
            if ($recipients->isEmpty()) {
                continue;
            }

            // 4. Creamos una notificación específica para la tienda con sus productos.
            $notification = new LowStockNotification(
                $lowStockRows,
                $threshold,
                $store // Pasamos la tienda a la notificación para más contexto
            );

            Notification::send($recipients, $notification);
        }
    }


    /**
     * Obtiene los destinatarios de alertas para una tienda específica.
     *
     * @param int $storeId
     * @return Collection
     */
    protected function recipientsForStore(int $storeId): Collection
    {
        $roleName = config('pos.alerts.recipients_role', 'manager');

        // Lógica ideal: Usuarios con un rol que están asignados a la tienda específica.
        // Esto asume que tienes una tabla pivote `store_user` y una relación en el modelo User.
        if (method_exists(User::class, 'role')) {
            $users = User::role($roleName)
                ->whereHas('stores', fn($query) => $query->where('stores.id', $storeId))
                ->get();

            if ($users->isNotEmpty()) {
                return $users;
            }
        }

        // Si lo anterior falla, volvemos a tu lógica de fallback original,
        // que notifica a todos los managers/admins como último recurso.
        return $this->globalRecipients();
    }

    /**
     * Fallback para obtener destinatarios globales si no se encuentran por tienda.
     */
    protected function globalRecipients(): Collection
    {
        $role = config('pos.alerts.recipients_role', 'manager');

        if (method_exists(User::class, 'role')) {
            $users = User::role($role)->get();
            if ($users->isNotEmpty()) return $users;
        }

        if (Schema::hasColumn('users', 'is_admin')) {
            $admins = User::where('is_admin', true)->get();
            if ($admins->isNotEmpty()) return $admins;
        }

        return User::query()->limit(1)->get();
    }
}
