<?php

namespace App\Services\Alerts;

use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\User;
use App\Notifications\LowStockNotification;
use App\Support\Alerts\AlertSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

class LowStockAlert
{
    public function __construct(
        private readonly AlertSettings $settings
    ) {}

    public function run(): void
    {
        Log::info('============ INICIANDO DIAGNÓSTICO DE ALERTA DE STOCK BAJO ============');
        // Tiendas activas
        $stores = Store::query()->where('is_active', true)->get();
        if ($stores->isEmpty()) {
            Log::warning('LowStockAlert: No se encontraron tiendas activas. Proceso terminado.');
            return;
        }
        Log::info('LowStockAlert: Encontradas ' . $stores->count() . ' tiendas activas.');
        $defaultThreshold = (int) config('pos.alerts.low_stock_threshold', 3);

        foreach ($stores as $store) {
            Log::info("LowStockAlert: Procesando tienda #{$store->id} '{$store->name}'...");
            // Candidatos por tienda
            $candidates = $this->recipientsForStore($store->id);
            if ($candidates->isEmpty()) {
                Log::warning("LowStockAlert: No se encontraron candidatos para la tienda '{$store->name}'. Saltando a la siguiente.");
                continue;
            }

            $allSettings = $this->settings->getForUsers($candidates);

            // Filtra candidatos por preferencia "low_stock_enabled" y filtro de tiendas
            $recipients = $candidates->filter(function (User $u) use ($store, $allSettings) {
                $userSettings = $allSettings->get($u->id);
                if (!(bool)($userSettings['low_stock_enabled'] ?? true)) return false;

                $overrides = $userSettings['overrides'] ?? null;
                $filter = null;
                if (is_array($overrides)) {
                    $s = $overrides['stores']['low_stock'] ?? null;
                    if (is_array($s) && !empty($s)) {
                        $filter = array_values(array_unique(array_map('intval', $s)));
                    }
                }

                return $filter ? in_array((int)$store->id, $filter, true) : true;
            });


            if ($recipients->isEmpty()) {
                Log::warning("LowStockAlert: Después de filtrar, no quedaron destinatarios para la tienda '{$store->name}'.");
                continue;
            }
            Log::info("LowStockAlert: Se encontraron {$recipients->count()} destinatarios para la tienda '{$store->name}'.");

            // Determina el UMBRAL MÁXIMO entre los destinatarios
            $maxThreshold = $recipients
                ->map(fn(User $u) => (int)($allSettings->get($u->id)['low_stock_threshold'] ?? $defaultThreshold))
                ->max() ?? $defaultThreshold;
            Log::info("LowStockAlert: El umbral máximo de stock para la consulta es: {$maxThreshold}.");

            // Trae variantes candidatas para la tienda con "quantity <= maxThreshold" o sin inventario
            // Nota: ajusta el nombre de la relación a la real ("inventories" si es hasMany)
            $variants = ProductVariant::query()
                ->select(['id', 'product_id'])
                ->with([
                    'product:id,name',
                    // carga SOLO inventario de esta tienda
                    'inventory' => function ($q) use ($store) {
                        $q->where('store_id', $store->id)->select(['id', 'product_variant_id', 'store_id', 'quantity']);
                    },
                ])
                ->where('is_active', true)
                ->whereHas('product', fn(Builder $q) => $q->where('product_nature', 'stockable'))
                ->where(function (Builder $q) use ($store, $maxThreshold) {
                    // tiene inventario en la tienda y está <= maxThreshold
                    $q->whereHas('inventory', function (Builder $inv) use ($store, $maxThreshold) {
                        $inv->where('store_id', $store->id)
                            ->where('quantity', '<=', $maxThreshold);
                    })
                        // o no tiene registro de inventario para esta tienda
                        ->orWhereDoesntHave('inventory', function (Builder $inv) use ($store) {
                            $inv->where('store_id', $store->id);
                        });
                })
                ->get();

            if ($variants->isEmpty()) {
                Log::warning("LowStockAlert: No se encontraron variantes de producto con stock bajo para la tienda '{$store->name}'.");
                continue;
            }
            Log::info("LowStockAlert: Se encontraron {$variants->count()} variantes con stock bajo.");

            // Notificación por usuario (filtrando por su umbral y canales)
            foreach ($recipients as $user) {
                $userSettings = $allSettings->get($user->id);
                $threshold = (int)($userSettings['low_stock_threshold'] ?? $defaultThreshold);
                $channels = (array)($userSettings['channels'] ?? ['database']);

                // ----- ¡ESTE ES EL LOG MÁS IMPORTANTE! -----
                Log::info("LowStockAlert: Intentando notificar al usuario ID {$user->id} por los canales: " . json_encode($channels));

                if (!in_array('broadcast', $channels)) {
                    Log::error("LowStockAlert: ¡PROBLEMA! El canal 'broadcast' NO está configurado para el usuario ID {$user->id}. Saltando notificación por broadcast.");
                }

                $rowsForUser = $variants->filter(function ($v) use ($store, $threshold) {
                    // si hay registro de inventario para la tienda
                    $qty = optional($v->inventory->first())->quantity ?? null;
                    if ($qty === null) {
                        // sin registro => tratamos como 0
                        return true;
                    }
                    return (float)$qty <= $threshold;
                });

                if ($rowsForUser->isEmpty()) {
                    continue;
                }
                Log::info("LowStockAlert: Enviando notificación al usuario ID {$user->id} con {$rowsForUser->count()} productos.");


                $user->notify(
                    (new LowStockNotification($rowsForUser, $threshold, $store))
                        ->onQueue('notifications')
                        ->setChannels($channels)
                );
            }
        }
        Log::info('============ DIAGNÓSTICO DE ALERTA DE STOCK BAJO FINALIZADO ============');
    }

    /**
     * Usuarios con rol esperado y asignados a la tienda (si aplica).
     */
    protected function recipientsForStore(int $storeId): Collection
    {
        $role = config('pos.alerts.recipients_role', 'manager');

        if (method_exists(User::class, 'role')) {
            $users = User::role($role)
                ->whereHas('stores', fn($q) => $q->where('stores.id', $storeId))
                ->get();

            if ($users->isNotEmpty()) return $users;
        }

        // fallbacks
        if (Schema::hasColumn('users', 'is_admin')) {
            $admins = User::where('is_admin', true)->get();
            if ($admins->isNotEmpty()) return $admins;
        }

        return User::query()->limit(1)->get();
    }
}
