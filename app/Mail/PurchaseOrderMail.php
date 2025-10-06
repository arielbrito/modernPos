<?php

// app/Mail/PurchaseOrderMail.php
namespace App\Mail;

use App\Models\Purchase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PurchaseOrderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Purchase $purchase,
        public string $subjectLine,
        public  string $bodyMessage
    ) {}

    public function build()
    {
        return $this->subject($this->subjectLine)
            ->markdown('emails.purchases.order', [
                'purchase'    => $this->purchase,
                'bodyMessage' => $this->bodyMessage,
            ])
            // Aseguramos que SIEMPRE haya un cuerpo 'text/plain'
            ->text('emails.purchases.order_plain', [
                'purchase'    => $this->purchase,
                'bodyMessage' => $this->bodyMessage,
            ]);
    }
}
