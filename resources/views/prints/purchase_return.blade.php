{{-- resources/views/prints/purchase_return.blade.php --}}
<!doctype html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <title>Devolución {{ $return->code }}</title>
    <style>
        * {
            box-sizing: border-box
        }

        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #222;
            font-size: 12px;
        }

        .wrap {
            width: 100%;
            margin: 0 auto;
        }

        .row {
            display: flex;
            gap: 16px;
        }

        .between {
            justify-content: space-between;
            align-items: center;
        }

        .muted {
            color: #666;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 10px;
            border: 1px solid #999;
            border-radius: 4px
        }

        h1 {
            font-size: 18px;
            margin: 0
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px
        }

        th,
        td {
            padding: 8px;
            border: 1px solid #ddd;
        }

        th {
            background: #f5f5f5;
            text-align: left
        }

        .right {
            text-align: right
        }

        .small {
            font-size: 11px
        }

        .totals td {
            font-weight: 700
        }

        .copy-watermark {
            position: absolute;
            right: 24px;
            top: 24px;
            font-size: 10px;
            color: #a00;
            border: 1px solid #a00;
            padding: 2px 6px;
            border-radius: 4px
        }
    </style>
</head>

<body>
    <div class="wrap">
        @if(!empty($is_copy))
        <div class="copy-watermark">COPIA</div>
        @endif

        <div class="row between" style="margin-bottom:10px">
            <div>
                <div style="font-size:16px; font-weight:700">{{ config('app.name','StoneRetail') }}</div>
                <div class="muted small">Tienda: {{ $return->store->name }}</div>
            </div>
            <div style="text-align:right">
                <h1>Devolución de Compra</h1>
                <div class="badge">Código: {{ $return->code }}</div>
            </div>
        </div>

        <table>
            <tr>
                <td><strong>Fecha:</strong> {{ $return->return_date->format('d/m/Y H:i') }}</td>
                <td><strong>Compra:</strong> {{ $return->purchase->code }}</td>
            </tr>
            <tr>
                <td><strong>Usuario:</strong> {{ $return->user->name ?? 'N/A' }}</td>
                <td><strong>Estado:</strong> {{ ucfirst($return->status) }}</td>
            </tr>
            @if($return->notes)
            <tr>
                <td colspan="2"><strong>Notas:</strong> {{ $return->notes }}</td>
            </tr>
            @endif
        </table>

        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th class="right">Cantidad</th>
                    <th class="right">Costo</th>
                    <th class="right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @php $units = 0; @endphp
                @foreach($return->items as $it)
                @php
                $units += (float)$it->quantity;
                @endphp
                <tr>
                    <td>{{ $it->variant->product->name }}</td>
                    <td>{{ $it->variant->sku }}</td>
                    <td class="right">{{ number_format($it->quantity,2) }}</td>
                    <td class="right">{{ number_format($it->unit_cost,4) }}</td>
                    <td class="right">{{ number_format($it->line_total,2) }}</td>
                </tr>
                @endforeach
                <tr class="totals">
                    <td colspan="2" class="right">Totales</td>
                    <td class="right">{{ number_format($units,2) }}</td>
                    <td></td>
                    <td class="right">{{ number_format($return->total_value,2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="row" style="margin-top:28px">
            <div style="flex:1">
                <div style="border-top:1px solid #999; width:75%">&nbsp;</div>
                <div class="small muted">Elaborado por</div>
            </div>
            <div style="flex:1">
                <div style="border-top:1px solid #999; width:75%">&nbsp;</div>
                <div class="small muted">Aprobado por</div>
            </div>
        </div>
    </div>
</body>

</html>