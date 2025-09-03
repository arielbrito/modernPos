<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    // Super-Admin todo lo puede
    public function before(User $authUser, string $ability): ?bool
    {
        return $authUser->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $authUser): bool
    {
        return $authUser->hasAnyRole(['Manager', 'Cashier', 'Super-Admin']);
    }

    public function view(User $authUser, User $subject): bool
    {
        // Puede verse a sí mismo o cualquier usuario si es Manager
        return $authUser->id === $subject->id || $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function create(User $authUser): bool
    {
        return $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function update(User $authUser, User $subject): bool
    {
        // No permitir degradar/eliminar Super-Admin si no eres tú mismo Super-Admin
        if ($subject->hasRole('Super-Admin') && $authUser->id !== $subject->id) {
            return false;
        }
        return $authUser->id === $subject->id || $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function delete(User $authUser, User $subject): bool
    {
        if ($subject->id === $authUser->id) return false;      // no auto-eliminarse
        if ($subject->hasRole('Super-Admin')) return false;    // no tocar superadmin
        return $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function restore(User $authUser, User $subject): bool
    {
        return $authUser->hasRole('Super-Admin');
    }

    public function forceDelete(User $authUser, User $subject): bool
    {
        return $authUser->hasRole('Super-Admin');
    }
}
