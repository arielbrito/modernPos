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

        /** @var Collection<int, \App\Models\Inventory> $rows */
        $rows = Inventory::query()
            ->with(['variant:id,sku,product_id,attributes', 'variant.product:id,name', 'store:id,code,name'])
            ->where('quantity', '<=', $threshold)
            ->orderBy('store_id')
            ->orderBy('product_variant_id')
            ->get();

        if ($rows->isEmpty()) {
            return;
        }

        // A quién notificamos
        $recipients = $this->recipients();
        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new LowStockNotification($rows, $threshold));
    }

    protected function recipients(): Collection
    {
        // Si tienes Spatie Permission
        $role = config('pos.alerts.recipients_role', 'manager');

        if (method_exists(User::class, 'role')) {
            $users = User::role($role)->get();
            if ($users->isNotEmpty()) return $users;
        }

        // Fallback: admin boolean si existe
        if (Schema::hasColumn('users', 'is_admin')) {
            $admins = User::where('is_admin', true)->get();
            if ($admins->isNotEmpty()) return $admins;
        }

        // Último fallback: primer usuario
        return User::query()->limit(1)->get();
    }
}
