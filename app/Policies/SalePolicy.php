<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;

class SalePolicy
{
    public function before(User $u, string $ability): ?bool
    {
        return $u->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $u): bool
    {
        return $u->can('sales.view');
    }
    public function view(User $u, Sale $s): bool
    {
        return $u->can('sales.view');
    }
    public function create(User $u): bool
    {
        return $u->can('sales.create');
    }

    public function refund(User $u, Sale $s): bool
    {
        // Solo ventas "completed" y permisos
        return $u->can('sales.refund') && $s->status === 'completed';
    }

    public function void(User $u, Sale $s): bool
    {
        return $u->can('sales.void') && $s->status === 'completed';
    }

    public function priceOverride(User $u): bool
    {
        return $u->can('sales.price.override');
    }

    public function discountOverride(User $u): bool
    {
        return $u->can('sales.discount.override');
    }
}
