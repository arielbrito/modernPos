<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Ajuste de Inventario {{ $adjustment->code }}</title>
    <style>
        /* ---- Reset/Tipografía ---- */
        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
        }

        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #111;
            font-size: 12px;
            line-height: 1.45;
        }

        /* ---- Página y layout ---- */
        @page {
            margin: 110px 40px 90px 40px;
        }

        /* top/right/bottom/left */

        header {
            position: fixed;
            top: -80px;
            left: 0;
            right: 0;
            height: 80px;
        }

        footer {
            position: fixed;
            bottom: -70px;
            left: 0;
            right: 0;
            height: 70px;
            font-size: 10px;
            color: #555;
        }

        .container {
            width: 100%;
        }

        /* ---- Utilidades ---- */
        .row {
            display: table;
            width: 100%;
        }

        .col {
            display: table-cell;
            vertical-align: top;
        }

        .left {
            text-align: left;
        }

        .right {
            text-align: right;
        }

        .muted {
            color: #666;
        }

        .small {
            font-size: 10px;
        }

        .brand {
            font-size: 18px;
            font-weight: 700;
        }

        .badge {
            display: inline-block;
            border: 1px solid #999;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            color: #444;
            background: #f4f4f4;
        }

        /* ---- Tablas ---- */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 6px 8px;
            border: 1px solid #e5e5e5;
        }

        thead th {
            background: #f2f2f2;
            font-weight: 600;
        }

        .no-border td,
        .no-border th {
            border: none;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .mono {
            font-family: DejaVu Sans Mono, Consolas, monospace;
        }

        .danger {
            color: #c1121f;
        }

        .success {
            color: #117a00;
        }

        /* ---- Secciones ---- */
        .h-title {
            font-size: 16px;
            font-weight: 700;
        }

        .subtle {
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 10px;
        }

        .mt-8 {
            margin-top: 8px;
        }

        .mt-12 {
            margin-top: 12px;
        }

        .mt-16 {
            margin-top: 16px;
        }

        .mt-24 {
            margin-top: 24px;
        }

        .mb-0 {
            margin-bottom: 0;
        }

        /* ---- Firma ---- */
        .sig-line {
            border-top: 1px solid #999;
            height: 1px;
            margin-top: 28px;
            width: 80%;
        }

        /* ---- Watermark ---- */
        .watermark {
            position: fixed;
            top: 35%;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 72px;
            color: #000;
            opacity: 0.06;
            transform: rotate(-18deg);
        }
    </style>
</head>

<body>

    {{-- Marca de agua si es copia --}}
    @if($isCopy)
    <div class="watermark">COPIA</div>
    @endif

    <header>
        <table class="no-border">
            <tr>
                <td class="left">
                    @if(!empty($logoBase64))
                    <img src="{{ $logoBase64 }}" alt="Logo" style="height:46px;">
                    @else
                    <div class="brand">{{ config('app.name', 'StoneRetail') }}</div>
                    @endif
                    <div class="small muted">{{ $adjustment->store->name }}</div>
                </td>
                <td class="right">
                    <div class="h-title">Ajuste de Inventario</div>
                    <div class="small">
                        <span class="badge">Código: {{ $adjustment->code }}</span>
                    </div>
                </td>
            </tr>
        </table>
    </header>

    <footer>
        <table class="no-border">
            <tr>
                <td class="left small muted">
                    Impreso el {{ now()->format('d/m/Y H:i') }}
                    &nbsp;·&nbsp; Documento: {{ $adjustment->code }}
                </td>
                <td class="right">
                    @if(!empty($qrBase64))
                    <img src="{{ $qrBase64 }}" alt="QR" style="height: 60px;">
                    @endif
                </td>
            </tr>
        </table>
    </footer>

    <main class="container">

        @php
        // Helper local de dinero para DomPDF
        if (!function_exists('dompdf_money')) {
        function dompdf_money($v) {
        $sign = $v < 0 ? '-' : '' ;
            $abs=abs((float)$v);
            return $sign . 'RD$' . number_format($abs, 2, '.' , ',' );
            }
            }
            @endphp

            {{-- Datos principales --}}
            <div class="subtle mt-8">
            <table class="no-border">
                <tr>
                    <td>
                        <strong>Fecha de ajuste:</strong><br>
                        {{ $adjustment->adjustment_date->format('d/m/Y H:i') }}
                    </td>
                    <td>
                        <strong>Motivo:</strong><br>
                        {{ $adjustment->reason }}
                    </td>
                    <td>
                        <strong>Tienda:</strong><br>
                        {{ $adjustment->store->name }}
                    </td>
                    <td>
                        <strong>Usuario:</strong><br>
                        {{ $adjustment->user->name ?? 'N/A' }}
                    </td>
                </tr>
            </table>
            </div>

            {{-- Tabla de items --}}
            <div class="mt-16">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th class="text-center">SKU</th>
                            <th class="text-right">Stock Anterior</th>
                            <th class="text-right">Stock Nuevo</th>
                            <th class="text-right">Ajuste</th>
                            <th class="text-right">Valor Cambio</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($adjustment->items as $item)
                        @php
                        $prev = (float) $item->previous_quantity;
                        $new = (float) $item->new_quantity;
                        $chg = $new - $prev;
                        $valueChange = $chg * (float) $item->cost; // costo promedio al momento
                        @endphp
                        <tr>
                            <td style="word-break: break-word;">
                                {{ $item->variant->product->name }}
                            </td>
                            <td class="text-center mono">{{ $item->variant->sku }}</td>
                            <td class="text-right mono">{{ rtrim(rtrim(number_format($prev, 2, '.', ','), '0'), '.') }}</td>
                            <td class="text-right mono">{{ rtrim(rtrim(number_format($new, 2, '.', ','), '0'), '.') }}</td>
                            <td class="text-right mono {{ $chg<0 ? 'danger' : 'success' }}">
                                {{ $chg>0 ? '+' : '' }}{{ rtrim(rtrim(number_format($chg, 2, '.', ','), '0'), '.') }}
                            </td>
                            <td class="text-right mono {{ $valueChange<0 ? 'danger' : 'success' }}">
                                {{ dompdf_money($valueChange) }}
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            {{-- Totales --}}
            <div class="mt-16">
                <table class="no-border">
                    <tr>
                        <td><strong>Ítems:</strong> {{ $adjustment->items->count() }}</td>
                        <td><strong>Entradas (u.):</strong> {{ (int) $entriesUnits }}</td>
                        <td><strong>Salidas (u.):</strong> {{ (int) $exitsUnits }}</td>
                        <td>
                            <strong>Neto (u.):</strong>
                            <span class="mono {{ $netUnits<0 ? 'danger' : 'success' }}">
                                {{ $netUnits>0 ? '+' : '' }}{{ (int) $netUnits }}
                            </span>
                        </td>
                        <td class="right">
                            <strong>Valor Neto:</strong>
                            <span class="mono {{ $netValue<0 ? 'danger' : 'success' }}">
                                {{ dompdf_money($netValue) }}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>

            {{-- Firmas --}}
            <div class="mt-24">
                <table class="no-border">
                    <tr>
                        <td>
                            <div class="sig-line"></div>
                            <div class="small muted">Elaborado por</div>
                        </td>
                        <td>
                            <div class="sig-line"></div>
                            <div class="small muted">Aprobado por</div>
                        </td>
                    </tr>
                </table>
            </div>

            {{-- Notas --}}
            @if($adjustment->notes)
            <div class="subtle mt-16">
                <strong>Notas:</strong>
                <div class="mt-8">{{ $adjustment->notes }}</div>
            </div>
            @endif
    </main>
</body>

</html>