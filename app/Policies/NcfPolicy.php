<?php

// app/Policies/NcfPolicy.php
namespace App\Policies;

use App\Models\User;

class NcfPolicy
{
    public function before(User $u, string $ability): ?bool
    {
        return $u->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $u): bool
    {
        return $u->can('ncf.view');
    }
    public function manage(User $u): bool
    {
        return $u->can('ncf.manage');
    }
    public function peek(User $u): bool
    {
        return $u->can('ncf.peek');
    }
    public function consume(User $u): bool
    {
        return $u->can('ncf.consume');
    }
}
