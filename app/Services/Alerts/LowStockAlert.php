<?php

namespace App\Services\Alerts;

use App\Models\Inventory;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use App\Notifications\LowStockNotification;
use Illuminate\Support\Facades\Schema;

class LowStockAlert
{
    public function run(): void
    {
        $threshold = (int) config('pos.alerts.low_stock_threshold', 3);

        $lowStockRows = Inventory::query()
            ->with(['variant:id,sku,product_id,attributes', 'variant.product:id,name', 'store:id,code,name'])
            ->where('quantity', '<=', $threshold)
            ->lazy();

        if ($lowStockRows->isEmpty()) {
            return;
        }

        $rowsByStore = $lowStockRows->groupBy('store_id');

        foreach ($rowsByStore as $storeId => $rowsInStore) {

            $recipients = $this->recipientsForStore($storeId);

            if ($recipients->isEmpty()) {
                continue;
            }

            // --- LA SOLUCIÓN ESTÁ AQUÍ ---
            // Convertimos la LazyCollection de esta tienda a una Collection normal.
            Notification::send($recipients, new LowStockNotification($rowsInStore->collect(), $threshold));
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
