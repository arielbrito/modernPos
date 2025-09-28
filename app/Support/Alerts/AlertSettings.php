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
        'low_stock_enabled' => true,
        'ncf_enabled'       => true,
        'low_stock_threshold' => 3,
        'ncf_threshold'       => 50,
        'channels'            => ['database'], // agrega 'mail' y/o 'broadcast' según el usuario
        'overrides'           => null,         // ej: ["stores":{"low_stock":[1,2], "ncf":[1]}]
    ];

    public function get(User $user): array
    {
        // CAMBIO: Se eliminó la comprobación ineficiente de Schema::hasTable
        $row = UserAlertSetting::firstOrCreate(
            ['user_id' => $user->id],
            self::DEFAULTS + ['user_id' => $user->id]
        );

        return array_replace(self::DEFAULTS, $row->only(array_keys(self::DEFAULTS)));
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
        $settings = UserAlertSetting::whereIn('user_id', $userIds)->get()->keyBy('user_id');

        return $users->mapWithKeys(function ($user) use ($settings) {
            $userSettings = $settings->get($user->id);
            $finalSettings = self::DEFAULTS;

            if ($userSettings) {
                $finalSettings = array_replace(self::DEFAULTS, $userSettings->only(array_keys(self::DEFAULTS)));
            }

            return [$user->id => $finalSettings];
        });
    }

    public function lowStockEnabled(User $user): bool
    {
        return (bool)($this->get($user)['low_stock_enabled'] ?? true);
    }

    public function ncfEnabled(User $user): bool
    {
        return (bool)($this->get($user)['ncf_enabled'] ?? true);
    }

    public function threshold(User $user, string $kind, int $fallback): int
    {
        $prefs = $this->get($user);
        if ($kind === 'low_stock') {
            return (int)($prefs['low_stock_threshold'] ?? $fallback);
        }
        if ($kind === 'ncf') {
            return (int)($prefs['ncf_threshold'] ?? $fallback);
        }
        return $fallback;
    }

    /**
     * Canales por usuario para cualquier tipo de alerta.
     * Retorna array como ['database','mail','broadcast'].
     */
    public function channels(User $user, string $kind): array
    {
        $prefs = $this->get($user);
        $channels = (array)($prefs['channels'] ?? ['database']);
        // Aquí podrías aplicar reglas por tipo si quisieras
        return array_values(array_unique($channels));
    }

    /**
     * Filtro de tiendas por tipo de alerta (si el usuario lo configuró).
     * Devuelve array<int> de store_ids o null si no hay filtro.
     */
    public function storeFilter(User $user, string $kind): ?array
    {
        $prefs = $this->get($user);
        $overrides = $prefs['overrides'] ?? null;
        if (!is_array($overrides)) return null;

        $stores = $overrides['stores'][$kind] ?? null;
        if (!is_array($stores) || empty($stores)) return null;

        return array_values(array_unique(array_map('intval', $stores)));
    }
}
