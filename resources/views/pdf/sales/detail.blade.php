@php
/** @var \App\Models\Sale $sale */
$ccy = $sale->currency_code ?? 'DOP';
$money = fn($n) => number_format((float)$n, 2, '.', ',') . ' ' . $ccy;
$doc = $sale->bill_to_doc_type === 'NONE'
? '—'
: trim(($sale->bill_to_doc_type ?? '').' '.($sale->bill_to_doc_number ?? ''));
$itemsCount = $sale->lines->sum('qty');
@endphp
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <title>Venta {{ $sale->number }}</title>
    <style>
        /* Dompdf-friendly CSS (sin fuentes web). */
        * {
            box-sizing: border-box;
        }

        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #111;
        }

        .wrap {
            max-width: 800px;
            margin: 0 auto;
        }

        h1,
        h2,
        h3 {
            margin: 0;
        }

        .muted {
            color: #666;
        }

        .mb0 {
            margin-bottom: 0
        }

        .mb4 {
            margin-bottom: 4px
        }

        .mb6 {
            margin-bottom: 6px
        }

        .mb8 {
            margin-bottom: 8px
        }

        .mb12 {
            margin-bottom: 12px
        }

        .mb16 {
            margin-bottom: 16px
        }

        .mt4 {
            margin-top: 4px
        }

        .mt8 {
            margin-top: 8px
        }

        .mt12 {
            margin-top: 12px
        }

        .grid {
            width: 100%;
        }

        .row {
            display: table;
            width: 100%;
        }

        .col {
            display: table-cell;
            vertical-align: top;
        }

        .w50 {
            width: 50%
        }

        .w33 {
            width: 33.33%
        }

        .right {
            text-align: right
        }

        .center {
            text-align: center
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 11px;
        }

        .badge--ok {
            background: #e8f5e9;
            border-color: #c8e6c9;
        }

        .box {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 6px 8px;
        }

        thead th {
            background: #f3f4f6;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            font-weight: bold;
        }

        tbody td {
            border-bottom: 1px solid #f1f5f9;
        }

        .totals td {
            padding: 4px 8px;
        }

        .totals .label {
            color: #555;
        }

        .totals .value {
            text-align: right;
        }

        .totals .grand {
            font-weight: bold;
            border-top: 1px solid #e5e7eb;
            padding-top: 6px;
        }

        .footer {
            margin-top: 18px;
            text-align: center;
            color: #666;
            font-size: 11px;
        }
    </style>
</head>

<body>
    <div class="wrap">

        {{-- Encabezado --}}
        <div class="row mb12">
            <div class="col w50">
                <h2 class="mb4">{{ $sale->store->name ?? 'Tienda' }}</h2>
                @if(!empty($sale->store?->rnc))
                <div class="muted mb0">RNC: {{ $sale->store->rnc }}</div>
                @endif
                @if(!empty($sale->store?->address))
                <div class="muted mb0">{{ $sale->store->address }}</div>
                @endif
                @if(!empty($sale->store?->phone))
                <div class="muted">Tel.: {{ $sale->store->phone }}</div>
                @endif
            </div>
            <div class="col w50 right">
                <h1 class="mb4">Venta {{ $sale->number }}</h1>
                <div class="muted">Fecha: {{ \Carbon\Carbon::parse($sale->occurred_at)->format('d/m/Y h:i a') }}</div>
                <div class="muted">Caja: {{ $sale->register->name ?? '—' }} · Vendedor: {{ $sale->user->name ?? '—' }}</div>
                <div>NCF: <strong>{{ $sale->ncf_number ?? '—' }}</strong> · Tipo: <strong>{{ $sale->ncf_type ?? '—' }}</strong></div>
            </div>
        </div>

        {{-- Cliente --}}
        <div class="box mb12">
            <div><strong>Cliente:</strong> {{ $sale->bill_to_name ?? 'Consumidor Final' }}</div>
            <div class="muted">Identificación: {{ $doc }} ·
                <span class="badge {{ $sale->bill_to_is_taxpayer ? 'badge--ok' : '' }}">
                    {{ $sale->bill_to_is_taxpayer ? 'Contribuyente' : 'Consumidor Final' }}
                </span>
            </div>
        </div>

        {{-- Detalle líneas --}}
        <table class="mb12">
            <thead>
                <tr>
                    <th style="width:12%">SKU</th>
                    <th>Descripción</th>
                    <th style="width:10%" class="right">Cant.</th>
                    <th style="width:12%" class="right">Precio</th>
                    <th style="width:12%" class="right">Desc.</th>
                    <th style="width:12%" class="right">ITBIS</th>
                    <th style="width:14%" class="right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->lines as $l)
                <tr>
                    <td>{{ $l->sku ?? '—' }}</td>
                    <td>{{ $l->name }}</td>
                    <td class="right">{{ number_format((float)$l->qty, 2, '.', ',') }}</td>
                    <td class="right">{{ $money($l->unit_price) }}</td>
                    <td class="right">{{ ($l->discount_amount ?? 0) > 0 ? $money($l->discount_amount) : '—' }}</td>
                    <td class="right">
                        @if(($l->tax_amount ?? 0) > 0)
                        {{ $money($l->tax_amount) }}@if($l->tax_rate) ({{ number_format($l->tax_rate*100,0) }}%)@endif
                        @else — @endif
                    </td>
                    <td class="right">{{ $money($l->line_total) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Totales --}}
        <table class="totals mb12">
            <tr>
                <td class="label">Ítems</td>
                <td class="value right">{{ count($sale->lines) }} (Cant.: {{ number_format((float)$itemsCount, 2, '.', ',') }})</td>
            </tr>
            <tr>
                <td class="label">Subtotal</td>
                <td class="value">{{ $money($sale->subtotal) }}</td>
            </tr>
            <tr>
                <td class="label">Descuentos</td>
                <td class="value">-{{ $money($sale->discount_total) }}</td>
            </tr>
            <tr>
                <td class="label">Impuestos</td>
                <td class="value">{{ $money($sale->tax_total) }}</td>
            </tr>
            <tr>
                <td class="label grand">TOTAL</td>
                <td class="value grand">{{ $money($sale->total) }}</td>
            </tr>
        </table>

        {{-- Pagos --}}
        <div class="box">
            <strong>Pagos</strong>
            @forelse($sale->payments as $p)
            <div>
                <span class="badge">{{ strtoupper($p->method) }}</span>
                &nbsp;Monto: <strong>{{ $money($p->amount) }}</strong>
                &nbsp;Moneda: {{ $p->currency_code }}
                @if($p->fx_rate_to_sale) · FX: {{ $p->fx_rate_to_sale }} @endif
                @if($p->reference) · Ref: {{ $p->reference }} @endif
                @if($p->method === 'cash')
                @if($p->tendered_amount) · Recibido: {{ $money($p->tendered_amount) }} @endif
                @if($p->change_amount) · Cambio: {{ $money($p->change_amount) }} @endif
                @endif
            </div>
            @empty
            <div class="muted">Sin pagos.</div>
            @endforelse
        </div>

        <div class="footer">
            ¡Gracias por su compra!
        </div>
    </div>
</body>

</html>