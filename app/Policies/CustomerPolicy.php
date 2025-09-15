<?php

// app/Policies/CustomerPolicy.php
namespace App\Policies;

use App\Models\User;
use App\Models\Customer;

class CustomerPolicy
{
    public function before(User $u, string $ability): ?bool
    {
        return $u->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $u): bool
    {
        return $u->can('customers.view');
    }
    public function view(User $u, Customer $c): bool
    {
        return $u->can('customers.view');
    }
    public function create(User $u): bool
    {
        return $u->can('customers.create');
    }
    public function update(User $u, Customer $c): bool
    {
        return $u->can('customers.update');
    }
    public function delete(User $u, Customer $c): bool
    {
        return $u->can('customers.delete');
    }
}
