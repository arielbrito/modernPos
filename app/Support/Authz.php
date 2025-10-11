<?php

namespace App\Support;

use App\Models\User;

class Authz
{
    public static function can(User $user, string $perm): bool
    {
        if (method_exists($user, 'hasPermissionTo')) {
            return $user->hasPermissionTo($perm);
        }
        return in_array($perm, $user->permissions ?? [], true) || ($user->role ?? null) === 'Super-Admin';
    }
}
