<?php

return [
    'map' => [
        // Ventas / devoluciones
        'revenue'           => '4-100',      // Ingresos por ventas (no usado en reverso directo; usamos contra-ingreso)
        'sales_returns'     => '4-190',      // Contra-ingreso (Debe en devoluciones)
        // Impuestos
        'tax_output'        => '2-200',      // ITBIS por pagar (Debe en devoluciones)
        // Costo e inventario
        'inventory'         => '1-130',
        'cogs'              => '5-500',
        // Medios de liquidación
        'accounts_receivable'       => '1-110', // reducción de AR (Haber)
        'cash_main'                 => '1-100', // caja/banco (Haber)
        'customer_credit_liability' => '2-410', // pasivo por crédito a favor (Haber)
    ],

    // Política por defecto al devolver si NO hay cash_refund explícito:
    'returns' => [
        'default_settlement' => 'customer_credit', // 'accounts_receivable' | 'cash' | 'customer_credit'
    ],
];
