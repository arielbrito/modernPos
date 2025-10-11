<?php


namespace App\Policies;


use App\Models\{JournalEntry, User};
use App\Support\Authz;


class JournalEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return Authz::can($user, 'accounting.view');
    }


    public function view(User $user, JournalEntry $entry): bool
    {
        return Authz::can($user, 'accounting.view');
    }


    public function export(User $user): bool
    {
        return Authz::can($user, 'accounting.export');
    }
}
