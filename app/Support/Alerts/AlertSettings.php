<?php

namespace App\Support\Alerts;

use App\Models\User;
use App\Models\UserAlertSetting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Collection;

/**
 * Fuente única de preferencias de alertas.
 */
class AlertSettings
{
    public const DEFAULTS = [
        'low_stock_enabled'   => true,
        'ncf_enabled'         => true,
        'low_stock_threshold' => 3,
        'ncf_threshold'       => 50,
        'channels'            => ['database'],
        'overrides'           => ['stores' => ['low_stock' => [], 'ncf' => []]],
        'quiet_hours'         => ['start' => null, 'end' => null, 'tz' => null],
    ];

    public function get(User $user): array
    {
        $settings = $user->alertSettings;

        if (!$settings) {
            // Si el usuario no tiene settings, los creamos con los valores por defecto.
            // Esto asegura que la relación $user->alertSettings no sea nula en futuras llamadas.
            $settings = $user->alertSettings()->create(self::DEFAULTS);
        }

        // Combinamos los valores por defecto con los guardados para asegurar que todos los campos existan.
        return array_replace_recursive(self::DEFAULTS, $settings->toArray());
    }

    /**
     * AÑADIDO: Nuevo método para cargar configuraciones en lote y evitar N+1 queries.
     *
     * @param Collection<User> $users
     * @return Collection
     */
    public function getForUsers(Collection $users): Collection
    {
        if ($users->isEmpty()) {
            return collect();
        }

        $userIds = $users->pluck('id');
        // Eager-load las configuraciones y las mapea por user_id para un acceso rápido.
        $settings = UserAlertSetting::whereIn('user_id', $userIds)->get()->keyBy('user_id');

        return $users->mapWithKeys(function ($user) use ($settings) {
            $userSettings = $settings->get($user->id);
            // Si un usuario no tiene settings, se le asignan los por defecto.
            $finalSettings = $userSettings
                ? array_replace_recursive(self::DEFAULTS, $userSettings->toArray())
                : self::DEFAULTS;

            return [$user->id => $finalSettings];
        });
    }

    public function lowStockEnabled(User $user, ?array $settings = null): bool
    {
        $settings = $settings ?? $this->get($user);
        return (bool)($settings['low_stock_enabled'] ?? true);
    }

    public function ncfEnabled(User $user, ?array $settings = null): bool
    {
        $settings = $settings ?? $this->get($user);
        return (bool)($settings['ncf_enabled'] ?? true);
    }

    public function threshold(User $user, string $kind, ?array $settings = null): int
    {
        $settings = $settings ?? $this->get($user);
        $key = "{$kind}_threshold"; // e.g., 'low_stock_threshold'
        return (int)($settings[$key] ?? self::DEFAULTS[$key]);
    }

    public function channels(User $user, ?array $settings = null): array
    {
        $settings = $settings ?? $this->get($user);
        return (array)($settings['channels'] ?? ['database']);
    }

    public function storeFilter(User $user, string $kind, ?array $settings = null): ?array
    {
        $settings = $settings ?? $this->get($user);
        $storeIds = $settings['overrides']['stores'][$kind] ?? null;

        if (empty($storeIds)) {
            return null; // Si no hay filtro, se aplica a todas las tiendas.
        }

        return array_values(array_unique(array_map('intval', $storeIds)));
    }
}
