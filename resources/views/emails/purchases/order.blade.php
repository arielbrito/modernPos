{{-- resources/views/emails/purchases/order.blade.php --}}
<x-mail::message>
    # Orden de compra {{ $purchase->code }}

    {{ $bodyMessage }}

    <x-mail::panel>
        **Proveedor:** {{ $purchase->supplier->name ?? '—' }}
        **Factura:** {{ $purchase->invoice_number ?? '—' }}
        **Fecha:** {{ $purchase->invoice_date?->format('d/m/Y') ?? '—' }}
    </x-mail::panel>

    Se adjunta el PDF de la orden.

    Gracias,
    {{ config('app.name') }}
</x-mail::message>