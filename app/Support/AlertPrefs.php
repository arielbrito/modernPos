<?php

// app/Support/AlertPrefs.php
namespace App\Support;

use App\Models\User;
use App\Models\UserAlertSetting;

class AlertPrefs
{
    public static function for(User $user): UserAlertSetting
    {
        return $user->alertSettings ?? new UserAlertSetting([
            'low_stock_enabled' => true,
            'low_stock_channels' => ['database'],
            'ncf_enabled' => true,
            'ncf_channels' => ['database'],
        ]);
    }

    public static function channels(User $user, string $kind): array
    {
        $prefs = self::for($user);
        $key = "{$kind}_channels";
        $channels = $prefs->{$key} ?? ['database'];

        // si no tiene email verificado, elimina mail
        if (in_array('mail', $channels, true) && empty($user->email_verified_at)) {
            $channels = array_values(array_diff($channels, ['mail']));
        }
        return $channels;
    }

    public static function threshold(User $user, string $kind, int $default): int
    {
        $prefs = self::for($user);
        $key = "{$kind}_threshold";
        return (int)($prefs->{$key} ?? $default);
    }

    public static function storeFilter(User $user, string $kind): ?array
    {
        $prefs = self::for($user);
        $key = "{$kind}_store_ids";
        $ids = $prefs->{$key} ?? null;
        return is_array($ids) && count($ids) ? $ids : null;
    }
}
