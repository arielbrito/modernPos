<?php

namespace App\Policies;

use App\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function before(User $authUser, string $ability): ?bool
    {
        return $authUser->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $authUser): bool
    {
        return $authUser->hasAnyRole(['Manager', 'Cashier', 'Super-Admin']);
    }

    public function view(User $user, Store $store): bool
    {
        // Pueden ver todo
        if ($user->hasAnyRole(['Super-Admin', 'Manager'])) {
            return true;
        }

        // Cualquier tienda a la que esté asignado (aunque no sea la activa)
        return $user->stores()->where('stores.id', $store->id)->exists();
    }

    public function create(User $authUser): bool
    {
        return $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function update(User $authUser, Store $store): bool
    {
        return $authUser->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function delete(User $authUser, Store $store): bool
    {
        return $authUser->hasRole('Super-Admin');
    }
}
