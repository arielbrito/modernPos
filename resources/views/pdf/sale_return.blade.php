@php($r = $ret)
<!doctype html>
<html>

<head>
    <meta charset="utf-8" />
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
        }

        .table th,
        .table td {
            border: 1px solid #ddd;
            padding: 6px;
        }

        .right {
            text-align: right;
        }

        .muted {
            color: #666;
            font-size: 11px;
        }
    </style>
</head>

<body>
    <h2>Comprobante de Devolución #{{ $r->id }}</h2>
    <div class="row">
        <div>
            <div class="muted">Venta</div>
            <div>#{{ $r->sale->number ?? $r->sale_id }}</div>
        </div>
        <div>
            <div class="muted">Fecha</div>
            <div>{{ $r->created_at }}</div>
        </div>
        <div>
            <div class="muted">Moneda</div>
            <div>{{ $r->currency_code }}</div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Línea</th>
                <th class="right">Cant.</th>
                <th class="right">Subtotal</th>
                <th class="right">Impuesto</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($r->lines as $l)
            <tr>
                <td>#{{ $l->sale_line_id }} {{ $l->reason ? '(' . $l->reason . ')' : '' }}</td>
                <td class="right">{{ number_format((float)$l->qty, 3) }}</td>
                <td class="right">{{ number_format((float)($l->subtotal_part ?? 0), 2) }}</td>
                <td class="right">{{ number_format((float)($l->tax_part ?? 0), 2) }}</td>
                <td class="right">{{ number_format((float)$l->refund_amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div style="margin-top: 12px; width: 50%; margin-left: auto;">
        <div class="row"><span>Subtotal</span><span class="right">{{ $r->currency_code }} {{ number_format((float)($r->subtotal_refund ?? 0), 2) }}</span></div>
        <div class="row"><span>Impuesto</span><span class="right">{{ $r->currency_code }} {{ number_format((float)($r->tax_refund ?? 0), 2) }}</span></div>
        <div class="row"><strong>Total</strong><strong class="right">{{ $r->currency_code }} {{ number_format((float)$r->total_refund, 2) }}</strong></div>
    </div>

    <p class="muted">Generado por ModernPOS</p>
</body>

</html>