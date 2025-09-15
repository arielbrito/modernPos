<?php

// app/Policies/RegisterPolicy.php
namespace App\Policies;

use App\Models\User;
use App\Models\Register;

class RegisterPolicy
{
    public function before(User $u, string $ability): ?bool
    {
        return $u->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $u): bool
    {
        // Manager y Cashier pueden ver (para abrir turno); Manager puede gestionar
        return $u->hasAnyRole(['Manager', 'Cashier', 'Super-Admin']);
    }

    public function view(User $u, Register $r): bool
    {
        // si el usuario pertenece a la tienda activa o tiene rol de Manager
        return $u->hasAnyRole(['Manager', 'Super-Admin']) || $u->stores()->whereKey($r->store_id)->exists();
    }

    public function create(User $u): bool
    {
        return $u->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function update(User $u, Register $r): bool
    {
        return $u->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function delete(User $u, Register $r): bool
    {
        return $u->hasAnyRole(['Manager', 'Super-Admin']);
    }

    public function toggle(User $u, Register $r): bool
    {
        return $u->hasAnyRole(['Manager', 'Super-Admin']);
    }
}
