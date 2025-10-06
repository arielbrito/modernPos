Orden de compra {{ $purchase->code }}

{{ $bodyMessage ?? '' }}

Proveedor: {{ $purchase->supplier->name ?? '—' }}
Factura: {{ $purchase->invoice_number ?? '—' }}
Fecha: {{ optional($purchase->invoice_date)->format('d/m/Y') ?? '—' }}

Se adjunta el PDF de la orden.

{{ config('app.name') }}