<?php

namespace App\Services\Alerts;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use App\Notifications\NcfRunningLowNotification;
use App\Models\User;

// Ajusta el namespace del modelo si difiere
use App\Models\NcfSequence;
use Illuminate\Support\Facades\Schema;

class NcfAlert
{
    public function run(): void
    {
        $threshold = (int) config('pos.alerts.ncf_threshold', 50);

        /** @var Collection<int, NcfSequence> $seqs */
        $seqs = NcfSequence::query()
            ->with(['store:id,code,name'])
            ->get()
            ->filter(function (NcfSequence $s) use ($threshold) {
                $remaining = $this->remainingFor($s);
                return $remaining !== null && $remaining <= $threshold;
            })
            ->values();

        if ($seqs->isEmpty()) return;

        $recipients = $this->recipients();
        if ($recipients->isEmpty()) return;

        Notification::send($recipients, new NcfRunningLowNotification($seqs, $threshold));
    }

    /**
     * Trata de calcular los NCF restantes para distintas variantes de esquema.
     * Ajusta según tu estructura real de NcfSequence.
     */
    protected function remainingFor(NcfSequence $s): ?int
    {
        // Si existe método en tu modelo
        if (method_exists($s, 'remaining')) {
            return (int) $s->remaining();
        }

        // Heurísticas por nombres comunes de columnas:
        $end = $s->end_number ?? $s->to ?? $s->last_number ?? null;
        $next = $s->next_number ?? $s->current_number ?? null;

        if (is_numeric($end) && is_numeric($next)) {
            $rem = (int) $end - (int) $next + 1;
            return max(0, $rem);
        }

        return null; // No se pudo inferir
    }

    protected function recipients(): Collection
    {
        $role = config('pos.alerts.recipients_role', 'manager');

        if (method_exists(User::class, 'role')) {
            $users = User::role($role)->get();
            if ($users->isNotEmpty()) return $users;
        }

        if (Schema::hasColumn('users', 'is_admin')) {
            $admins = User::where('is_admin', true)->get();
            if ($admins->isNotEmpty()) return $admins;
        }

        return User::query()->limit(1)->get();
    }
}
