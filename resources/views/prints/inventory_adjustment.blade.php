<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Ajuste de Inventario {{ $adjustment->code }}</title>
    <style>
        body {
            font-family: 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .container {
            width: 100%;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
        }

        .header p {
            margin: 2px 0;
            font-size: 14px;
            color: #666;
        }

        .details {
            margin-bottom: 20px;
            border: 1px solid #eee;
            padding: 15px;
            border-radius: 5px;
        }

        .details table {
            width: 100%;
        }

        .details td {
            padding: 5px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        .items-table th {
            background-color: #f2f2f2;
        }

        .text-right {
            text-align: right;
        }

        .notes {
            margin-top: 20px;
            padding: 10px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #555;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Ajuste de Inventario</h1>
            <p><strong>Tienda:</strong> {{ $adjustment->store->name }}</p>
            <p><strong>Código:</strong> {{ $adjustment->code }}</p>
        </div>

        <div class="details">
            <table>
                <tr>
                    <td><strong>Fecha de Ajuste:</strong></td>
                    <td>{{ $adjustment->adjustment_date->format('d/m/Y H:i A') }}</td>
                </tr>
                <tr>
                    <td><strong>Motivo:</strong></td>
                    <td>{{ $adjustment->reason }}</td>
                </tr>
                <tr>
                    <td><strong>Realizado por:</strong></td>
                    <td>{{ $adjustment->user->name ?? 'N/A' }}</td>
                </tr>
            </table>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Producto (SKU)</th>
                    <th class="text-right">Stock Anterior</th>
                    <th class="text-right">Stock Nuevo</th>
                    <th class="text-right">Ajuste</th>
                </tr>
            </thead>
            <tbody>
                @foreach($adjustment->items as $item)
                <tr>
                    <td>
                        {{ $item->variant->product->name }}<br>
                        <small>SKU: {{ $item->variant->sku }}</small>
                    </td>
                    <td class="text-right">{{ rtrim(rtrim(number_format($item->previous_quantity, 2), '0'), '.') }}</td>
                    <td class="text-right">{{ rtrim(rtrim(number_format($item->new_quantity, 2), '0'), '.') }}</td>
                    <td class="text-right">
                        @php
                        $change = $item->new_quantity - $item->previous_quantity;
                        echo ($change > 0 ? '+' : '') . rtrim(rtrim(number_format($change, 2), '0'), '.');
                        @endphp
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>

        @if($adjustment->notes)
        <div class="notes">
            <strong>Notas:</strong>
            <p>{{ $adjustment->notes }}</p>
        </div>
        @endif
    </div>
</body>

</html>