<?php

// app/Policies/CashShiftPolicy.php
namespace App\Policies;

use App\Models\User;
use App\Models\CashShift;
use App\Models\Register;

class CashShiftPolicy
{
    public function before(User $u, string $ability): ?bool
    {
        return $u->hasRole('Super-Admin') ? true : null;
    }

    public function view(User $user, CashShift $shift): bool
    {
        return $user->can('view', $shift->register);
    }

    public function viewAny(User $u): bool
    {
        return $u->can('cash_shifts.view');
    }
    public function open(User $u, Register $r): bool
    {
        if (!$u->can('cash_shifts.open')) return false;
        // la caja debe estar activa
        return (bool)$r->active;
    }
    public function operate(User $u, CashShift $s): bool
    {
        if (!$u->can('cash_shifts.operate')) return false;
        return $s->status === 'open' && is_null($s->closed_at);
    }
    public function close(User $u, CashShift $s): bool
    {
        if (!$u->can('cash.close')) return false;

        // Quien lo abrió puede cerrarlo; supervisores con override también.
        if ($u->id === (int)$s->opened_by) return true;

        return $u->can('cash_shifts.close');
    }
    public function forceClose(User $u, CashShift $s): bool
    {
        return $u->can('cash_shifts.force_close');
    }
}
