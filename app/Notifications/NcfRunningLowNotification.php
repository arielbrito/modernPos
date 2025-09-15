<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class NcfRunningLowNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Collection $sequences,
        protected int $threshold
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $items = $this->sequences->map(function ($s) {
            $store = $s->store?->code ?? $s->store_id;
            $type  = $s->type ?? ($s->ncf_type ?? 'NCF');
            $end   = $s->end_number ?? $s->to ?? $s->last_number ?? null;
            $next  = $s->next_number ?? $s->current_number ?? null;

            $remaining = null;
            if (is_numeric($end) && is_numeric($next)) {
                $remaining = max(0, (int)$end - (int)$next + 1);
            }

            return [
                'store'     => $store,
                'type'      => $type,
                'remaining' => $remaining,
            ];
        })->values();

        return [
            'title'   => 'NCF próximos a agotarse',
            'message' => "Secuencias con <= {$this->threshold} NCF restantes.",
            'items'   => $items,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Alerta: NCF próximos a agotarse')
            ->line("Existen {$this->sequences->count()} secuencias con <= {$this->threshold} NCF restantes.");

        foreach ($this->sequences->take(5) as $s) {
            $store = $s->store?->code ?? $s->store_id;
            $type  = $s->type ?? ($s->ncf_type ?? 'NCF');
            $end   = $s->end_number ?? $s->to ?? $s->last_number ?? null;
            $next  = $s->next_number ?? $s->current_number ?? null;
            $remaining = (is_numeric($end) && is_numeric($next)) ? max(0, (int)$end - (int)$next + 1) : 'N/D';

            $mail->line("- {$store} | {$type} | restantes: {$remaining}");
        }

        return $mail;
    }
}
