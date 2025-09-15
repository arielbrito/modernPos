<?php

return [
    'alerts' => [
        // Umbral de alerta de stock bajo por variante
        'low_stock_threshold' => env('POS_LOW_STOCK_THRESHOLD', 3),

        // Umbral de alerta para NCF restantes en una secuencia
        'ncf_threshold' => env('POS_NCF_THRESHOLD', 50),

        // Rol que recibirá notificaciones (vía Spatie Permissions). Ej: manager
        'recipients_role' => env('POS_ALERTS_ROLE', 'manager'),

        // Zona horaria para el schedule (solo informativa aquí)
        'timezone' => env('APP_TIMEZONE', 'America/Santo_Domingo'),
    ],
];
