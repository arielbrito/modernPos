<?php

// app/Observers/StoreObserver.php
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Store;
use Illuminate\Support\Facades\Auth;

class StoreObserver
{
    public function created(Store $store): void
    {
        ActivityLog::record($store, 'created', ['new' => $store->getAttributes()], Auth::id());
    }

    public function updated(Store $store): void
    {
        $changed = $store->getChanges();
        if (empty($changed)) return;

        $old = array_intersect_key($store->getOriginal(), $changed);
        ActivityLog::record($store, 'updated', ['old' => $old, 'new' => $changed], Auth::id());
    }

    public function deleted(Store $store): void
    {
        ActivityLog::record($store, 'deleted', ['old' => $store->getOriginal()], Auth::id());
    }
}
