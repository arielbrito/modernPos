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
        return $u->can('cash_shifts.open');
    }
    public function operate(User $u, CashShift $s): bool
    {
        return $u->can('cash_shifts.operate') && $s->status === 'open';
    }
    public function close(User $u, CashShift $s): bool
    {
        return $u->can('cash_shifts.close')   && $s->status === 'open';
    }
    public function forceClose(User $u, CashShift $s): bool
    {
        return $u->can('cash_shifts.force_close');
    }
}
