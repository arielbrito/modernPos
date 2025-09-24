<?php

// app/Policies/PurchasePolicy.php
namespace App\Policies;

use App\Models\Purchase;
use App\Models\User;

class PurchasePolicy
{
    public function viewAny(User $u): bool
    {
        return $u->can('purchases.view');
    }
    public function view(User $u, Purchase $p): bool
    {
        return $u->can('purchases.view');
    }
    public function create(User $u): bool
    {
        return $u->can('purchases.create');
    }
    public function approve(User $u, Purchase $p): bool
    {
        return $u->can('purchases.approve') && $p->status === 'draft';
    }

    public function update(User $u, Purchase $p): bool
    {
        return $u->can('purchases.update') && $p->status === 'draft';
    }
    public function receive(User $u, Purchase $p): bool
    {
        return $u->can('purchases.receive') && in_array($p->status, ['approved', 'partially_received']);
    }
    public function pay(User $u, Purchase $p): bool
    {
        return $u->can('purchases.pay') && in_array($p->status, ['partially_received', 'received']);
    }
    public function cancel(User $u, Purchase $p): bool
    {
        return $u->can('purchases.cancel') && !in_array($p->status, ['received', 'partially_received', 'cancelled']);
    }
}
