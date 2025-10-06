@component('mail::message')
# Orden de compra {{ $purchase->code }}

{!! nl2br(e($bodyMessage ?? '')) !!}

@component('mail::panel')
**Proveedor:** {{ $purchase->supplier->name ?? '—' }}
**Factura:** {{ $purchase->invoice_number ?? '—' }}
**Fecha:** {{ optional($purchase->invoice_date)->format('d/m/Y') ?? '—' }}
@endcomponent

Se adjunta el PDF de la orden.

Gracias,
{{ config('app.name') }}
@endcomponent