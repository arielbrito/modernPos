<?php

namespace App\Services\Alerts;

use App\Models\NcfSequence;
use App\Models\User;
use App\Notifications\NcfRunningLowNotification;
use App\Support\Alerts\AlertSettings;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

class NcfAlert
{
    public function __construct(
        private readonly AlertSettings $settings
    ) {}

    public function run(): void
    {
        $default = (int) config('pos.alerts.ncf_threshold', 50);

        // Candidatos globales (por rol/admin)
        $candidates = $this->recipients();
        if ($candidates->isEmpty()) return;

        // Filtra por quienes tienen NCF habilitado
        $allSettings = $this->settings->getForUsers($candidates);

        // Filtra por quienes tienen NCF habilitado
        $recipients = $candidates->filter(
            fn(User $u) =>
            (bool)($allSettings->get($u->id)['ncf_enabled'] ?? true)
        );
        if ($recipients->isEmpty()) return;

        // Determina umbral MAX entre destinatarios
        $maxThreshold = $recipients
            ->map(fn(User $u) => (int)($allSettings->get($u->id)['ncf_threshold'] ?? $default))
            ->max() ?? $default;

        // Trae el superset de secuencias bajo el umbral max
        $seqs = NcfSequence::query()
            ->with(['store:id,code,name'])
            ->where('active', true)
            ->whereRaw('COALESCE(end_number, 0) - COALESCE(next_number, 0) + 1 <= ?', [$maxThreshold])
            ->get();

        if ($seqs->isEmpty()) return;

        // Notifica por usuario, filtrando por su umbral y filtro de tiendas si lo hay
        foreach ($recipients as $user) {
            $userSettings = $allSettings->get($user->id, AlertSettings::DEFAULTS);
            $threshold = (int)($userSettings['ncf_threshold'] ?? $default);
            $channels = (array)($userSettings['channels'] ?? ['database']);
            $overrides = $userSettings['overrides'] ?? null;

            // Lógica de filtrado de tiendas (extraída de AlertSettings para usar aquí)
            $filterStores = null;
            if (is_array($overrides)) {
                $stores = $overrides['stores']['ncf'] ?? null;
                if (is_array($stores) && !empty($stores)) {
                    $filterStores = array_values(array_unique(array_map('intval', $stores)));
                }
            }

            $seqsForUser = $seqs->filter(function ($s) use ($threshold, $filterStores) {
                $end = $s->end_number ?? $s->to ?? $s->last_number ?? null;
                $next = $s->next_number ?? $s->current_number ?? null;
                $remaining = (is_numeric($end) && is_numeric($next)) ? max(0, (int)$end - (int)$next + 1) : null;

                if ($remaining !== null && $remaining > $threshold) return false;
                if ($filterStores) return in_array((int)$s->store_id, $filterStores, true);
                return true;
            });

            if ($seqsForUser->isEmpty()) continue;

            $channels = $this->settings->channels($user, 'ncf');

            $user->notify(
                (new NcfRunningLowNotification($seqsForUser, $threshold))
                    ->onQueue('notifications')
                    ->setChannels($channels)
            );
        }
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
