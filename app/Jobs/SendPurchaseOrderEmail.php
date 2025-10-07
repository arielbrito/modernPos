<?php

namespace App\Jobs;

use App\Mail\PurchaseOrderMail;
use App\Models\Purchase;
use App\Models\PurchaseEmailLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SendPurchaseOrderEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $logId,
        public int $purchaseId,
        public string $to,
        public ?string $cc,
        public string $subject,
        public string $body,        // <- ¡nunca null!
        public string $storagePath, // p.ej. tmp/purchase-orders/orden-OC-...-uuid.pdf
    ) {}

    public function handle(): void
    {
        // Carga fresca desde DB para evitar serializar relaciones
        $purchase = Purchase::with(['supplier', 'items.productVariant.product', 'store'])
            ->findOrFail($this->purchaseId);

        $filename = basename($this->storagePath);

        $mailable = (new PurchaseOrderMail(
            purchase: $purchase,
            subjectLine: $this->subject,
            bodyMessage: $this->body
        ))->attachFromStorage($this->storagePath, $filename, ['mime' => 'application/pdf']);

        Mail::to($this->to)
            ->when(!empty($this->cc), fn($m) => $m->cc($this->cc))
            ->send($mailable);

        // Actualiza log
        if ($log = PurchaseEmailLog::find($this->logId)) {
            $log->update([
                'status'  => 'sent',
                'sent_at' => now(),
            ]);
        }

        // Limpieza del adjunto temporal
        Storage::delete($this->storagePath);
    }

    public function failed(\Throwable $e): void
    {
        if ($log = PurchaseEmailLog::find($this->logId)) {
            $log->update([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ]);
        }

        Storage::delete($this->storagePath);
    }
}
