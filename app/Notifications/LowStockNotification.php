<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class LowStockNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Collection $rows,
        protected int $threshold
    ) {}

    public function via(object $notifiable): array
    {
        // Agrega 'mail' si tienes mailer configurado
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        // Limita detalle para payload
        $sample = $this->rows->take(10)->map(function ($r) {
            return [
                'store'   => $r->store?->code ?? $r->store_id,
                'sku'     => $r->variant?->sku,
                'product' => $r->variant?->product?->name,
                'qty'     => (float) $r->quantity,
            ];
        })->values();

        return [
            'title'   => 'Stock bajo',
            'message' => "Variantes con stock <= {$this->threshold}",
            'count'   => $this->rows->count(),
            'items'   => $sample,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Alerta: Stock bajo')
            ->line("Se detectaron {$this->rows->count()} variantes con stock bajo (<= {$this->threshold}).")
            ->line('Ejemplo:');

        foreach ($this->rows->take(5) as $r) {
            $mail->line(sprintf(
                '- %s | %s | %s | qty: %s',
                $r->store?->code ?? $r->store_id,
                $r->variant?->sku ?? '—',
                $r->variant?->product?->name ?? '—',
                number_format((float)$r->quantity, 2)
            ));
        }

        return $mail;
    }
}
