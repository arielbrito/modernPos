<?php

namespace App\Policies;

use App\Models\{SaleReturn, Sale, User};
use App\Support\Authz;

class SaleReturnPolicy
{
    /**
     * Create a new policy instance.
     */
    public function __construct() {}

    public function before(User $user, string $ability): ?bool
    {
        return $user->hasRole('Super-Admin') ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return Authz::can($user, 'sales_returns.view');
    }


    public function view(User $user, SaleReturn $saleReturn): bool
    {
        return Authz::can($user, 'sales_returns.view');
    }


    public function create(User $user, Sale $sale): bool
    {
        if ($sale->status !== 'completed') return false;
        return Authz::can($user, 'sales_returns.create') && Authz::can($user, 'sales.refund');
    }


    public function update(User $user, SaleReturn $saleReturn): bool
    {
        if ($saleReturn->journal_entry_id) return false; // ya contabilizado
        return Authz::can($user, 'sales_returns.update');
    }


    public function delete(User $user, SaleReturn $saleReturn): bool
    {
        if ($saleReturn->journal_entry_id) return false; // o aplica SoftDelete + reverso
        return Authz::can($user, 'sales_returns.delete');
    }


    public function export(User $user): bool
    {
        return Authz::can($user, 'sales_returns.export');
    }
}
