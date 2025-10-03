<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Compra {{ $purchase->code }}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
        /* ⚠️ Mantener CSS simple y compatible con DomPDF */
        @page {
            margin: 22mm 16mm;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #222;
        }

        .wrapper {
            width: 100%;
        }

        .row {
            width: 100%;
        }

        .pull-right {
            text-align: right;
        }

        .muted {
            color: #666;
        }

        .small {
            font-size: 11px;
        }

        .xs {
            font-size: 10px;
        }

        .h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 4px;
        }

        .h2 {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 4px;
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            border: 1px solid #3AB795;
            color: #3AB795;
        }

        .divider {
            height: 1px;
            border-top: 1px solid #e5e7eb;
            margin: 10px 0;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
        }

        th {
            background: #f6f9f8;
            text-align: left;
            font-size: 11px;
        }

        td.num,
        th.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        .no-border td,
        .no-border th {
            border: none;
        }

        .totals td {
            border: none;
        }

        .totals .line {
            border-top: 1px solid #e5e7eb;
        }

        .note {
            border: 1px solid #e5e7eb;
            background: #fafafa;
            padding: 8px;
            border-radius: 6px;
        }

        .logo-box {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px;
        }

        .footer {
            position: fixed;
            bottom: -10mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #777;
        }

        .mt-6 {
            margin-top: 16px;
        }

        .mt-10 {
            margin-top: 28px;
        }

        .mb-2 {
            margin-bottom: 6px;
        }

        .mb-4 {
            margin-bottom: 12px;
        }

        .grid-2 {
            width: 100%;
        }

        .col {
            vertical-align: top;
        }

        .col-6 {
            width: 50%;
            display: inline-block;
        }

        .w-60 {
            width: 60%;
        }

        .w-40 {
            width: 40%;
        }

        .sign-box {
            height: 70px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            padding-top: 6px;
        }

        .copy-label {
            font-size: 11px;
            color: #1f8a70;
            border: 1px solid #1f8a70;
            padding: 2px 6px;
            border-radius: 10px;
            display: inline-block;
        }
    </style>
</head>

<body>
    <div class="wrapper">

        {{-- Encabezado --}}
        <table class="no-border" style="width:100%;">
            <tr>
                <td class="col w-60">
                    <div class="logo-box">
                        {{-- Si tienes logo, colócalo aquí como <img> con ruta pública --}}
                        <div class="h1" style="color:#2C2C2C;">StoneRetail</div>
                        <div class="small muted">Sistema de Compras</div>
                    </div>
                </td>
                <td class="col w-40 pull-right">
                    <div class="h2">Orden de Compra</div>
                    <div><strong>Código:</strong> {{ $purchase->code }}</div>
                    <div><strong>Estado:</strong> <span class="badge">{{ strtoupper($purchase->status) }}</span></div>
                    @if(request('copy') == '1')
                    <div class="mt-6"><span class="copy-label">COPIA</span></div>
                    @endif
                </td>
            </tr>
        </table>

        <div class="divider"></div>

        {{-- Datos de tienda / proveedor / factura --}}
        <table class="no-border" style="width:100%;">
            <tr>
                <td class="col col-6">
                    <div class="h2">Proveedor</div>
                    <div><strong>{{ $purchase->supplier->name ?? 'N/A' }}</strong></div>
                    @if(!empty($purchase->supplier->tax_id))
                    <div class="small muted">RNC: {{ $purchase->supplier->tax_id }}</div>
                    @endif
                    @if(!empty($purchase->supplier->phone))
                    <div class="small muted">Tel: {{ $purchase->supplier->phone }}</div>
                    @endif
                    @if(!empty($purchase->supplier->email))
                    <div class="small muted">Email: {{ $purchase->supplier->email }}</div>
                    @endif
                </td>
                <td class="col col-6">
                    <div class="h2">Detalles</div>
                    <div class="small"><strong>Tienda:</strong> {{ $purchase->store->name ?? '—' }}</div>
                    <div class="small"><strong>Factura:</strong> {{ $purchase->invoice_number ?? '—' }}</div>
                    <div class="small"><strong>Fecha Factura:</strong> {{ $purchase->invoice_date?->format('d/m/Y') ?? '—' }}</div>
                    <div class="small"><strong>Moneda:</strong> {{ $purchase->currency ?? 'DOP' }}</div>
                </td>
            </tr>
        </table>

        <div class="mt-6"></div>

        {{-- Tabla de ítems --}}
        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="num">Cant.</th>
                    <th class="num">Costo</th>
                    <th class="num">Desc. %</th>
                    <th class="num">Imp. %</th>
                    <th class="num">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @php
                $fmt = fn($n,$d=2)=> rtrim(rtrim(number_format((float)$n,$d,'.',','),'0'),'.');
                @endphp
                @forelse($purchase->items as $it)
                @php
                $name = $it->productVariant->product->name ?? '';
                $sku = $it->productVariant->sku ?? '';
                $qty = (float) $it->qty_ordered;
                $unit = (float) $it->unit_cost;
                $disc = (float) ($it->discount_pct ?? 0);
                $tax = (float) ($it->tax_pct ?? 0);
                $line = (float) $it->line_total;
                @endphp
                <tr>
                    <td>
                        <strong>{{ $name }}</strong><br>
                        <span class="xs muted">SKU: {{ $sku }}</span>
                    </td>
                    <td class="num">{{ $fmt($qty,2) }}</td>
                    <td class="num">{{ $fmt($unit,2) }}</td>
                    <td class="num">{{ $fmt($disc,2) }}</td>
                    <td class="num">{{ $fmt($tax,2) }}</td>
                    <td class="num"><strong>{{ $fmt($line,2) }}</strong></td>
                </tr>
                @empty
                <tr>
                    <td colspan="6" class="small muted">No hay ítems en esta compra.</td>
                </tr>
                @endforelse
            </tbody>
        </table>

        {{-- Totales --}}
        @php
        $subtotal = (float) $purchase->subtotal;
        $discount_total = (float) $purchase->discount_total;
        $tax_total = (float) $purchase->tax_total;
        $freight = (float) $purchase->freight;
        $other = (float) $purchase->other_costs;
        $grand = (float) $purchase->grand_total;
        $paid = (float) $purchase->paid_total;
        $balance = (float) $purchase->balance_total;
        @endphp

        <table class="no-border" style="width:100%; margin-top:10px;">
            <tr>
                <td class="col w-60">
                    @if(!empty($purchase->notes))
                    <div class="h2 mb-2">Notas</div>
                    <div class="note">{{ $purchase->notes }}</div>
                    @endif
                </td>
                <td class="col w-40">
                    <table class="totals" style="width:100%;">
                        <tr>
                            <td class="pull-right">Subtotal</td>
                            <td class="num" style="width:120px;">{{ $fmt($subtotal,2) }}</td>
                        </tr>
                        @if($discount_total > 0)
                        <tr>
                            <td class="pull-right">Descuentos</td>
                            <td class="num">- {{ $fmt($discount_total,2) }}</td>
                        </tr>
                        @endif
                        @if($tax_total > 0)
                        <tr>
                            <td class="pull-right">Impuestos</td>
                            <td class="num">{{ $fmt($tax_total,2) }}</td>
                        </tr>
                        @endif
                        @if(($freight + $other) > 0)
                        <tr>
                            <td class="pull-right">Flete y Otros</td>
                            <td class="num">{{ $fmt($freight + $other,2) }}</td>
                        </tr>
                        @endif
                        <tr>
                            <td class="pull-right line"><strong>Total</strong></td>
                            <td class="num line"><strong>{{ $fmt($grand,2) }}</strong></td>
                        </tr>
                        @if($paid > 0)
                        <tr>
                            <td class="pull-right">Pagado</td>
                            <td class="num">{{ $fmt($paid,2) }}</td>
                        </tr>
                        @endif
                        <tr>
                            <td class="pull-right"><strong>Balance</strong></td>
                            <td class="num"><strong>{{ $fmt($balance,2) }}</strong></td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        {{-- Firmas --}}
        <table class="no-border" style="width:100%; margin-top:20px;">
            <tr>
                <td class="col col-6">
                    <div class="sign-box">Autorizado por</div>
                </td>
                <td class="col col-6">
                    <div class="sign-box">Recibido por</div>
                </td>
            </tr>
        </table>

    </div>

    <div class="footer">
        Documento generado por StoneRetail · {{ now()->format('d/m/Y H:i') }}
    </div>
</body>

</html>