<?php

// app/Mail/PurchaseOrderMail.php
namespace App\Mail;

use App\Models\Purchase;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseOrderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Purchase $purchase,
        public string $bodyMessage = ''
    ) {}

    public function build()
    {
        $pdf = Pdf::loadView('prints.purchase_order', [
            'purchase' => $this->purchase->load('items.productVariant.product', 'supplier', 'store', 'user'),
            'paper'    => 'a4',
            'copy'     => false,
        ])->setPaper('a4');

        return $this->subject("Orden de compra {$this->purchase->code}")
            ->markdown('emails.purchases.order', [
                'purchase' => $this->purchase,
                'bodyMessage' => $this->bodyMessage,
            ])
            ->attachData(
                $pdf->output(),
                "OC-{$this->purchase->code}.pdf",
                ['mime' => 'application/pdf']
            );
    }
}
