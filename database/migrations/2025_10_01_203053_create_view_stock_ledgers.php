<?php

// database/migrations/2025_10_01_160000_create_view_stock_ledgers.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        // Borrar si existiera
        if ($driver !== 'sqlite') {
            DB::statement("DROP VIEW IF EXISTS stock_ledgers");
        } else {
            DB::statement("DROP VIEW IF EXISTS stock_ledgers"); // SQLite también soporta DROP VIEW
        }

        // Crear la vista mapeando tus tipos a reason + qty_in/qty_out
        $sql = <<<SQL
CREATE VIEW stock_ledgers AS
SELECT
    psm.id                AS id,
    psm.store_id          AS store_id,
    psm.product_variant_id AS product_variant_id,
    psm.created_at        AS moved_at,
    CASE psm.type
        WHEN 'purchase_entry'       THEN 'purchase_receive'
        WHEN 'sale_exit'            THEN 'sale_issue'
        WHEN 'sale_return_entry'    THEN 'sale_return'
        WHEN 'purchase_return_exit' THEN 'purchase_return'
        WHEN 'adjustment_in'        THEN 'adjustment_in'
        WHEN 'adjustment_out'       THEN 'adjustment_out'
        ELSE 'correction'
    END                    AS reason,
    CASE WHEN psm.type IN ('purchase_entry','sale_return_entry','adjustment_in')
         THEN psm.quantity ELSE 0 END AS qty_in,
    CASE WHEN psm.type IN ('sale_exit','purchase_return_exit','adjustment_out')
         THEN psm.quantity ELSE 0 END AS qty_out,
    'EA'                   AS uom,
    -- Nota: unit_price en movimientos puede ser costo o precio según origen.
    -- Para valuación, solo tiene sentido costo en entradas (purchase_entry).
    CASE WHEN psm.type IN ('purchase_entry','adjustment_in')
         THEN psm.unit_price ELSE NULL END AS unit_cost,
    CASE WHEN psm.type IN ('purchase_entry','adjustment_in')
         THEN (psm.unit_price * psm.quantity) ELSE NULL END AS ext_cost,
    NULL AS meta,
    psm.user_id AS created_by,
    psm.created_at AS created_at,
    psm.updated_at AS updated_at
FROM product_stock_movements psm
SQL;

        DB::statement($sql);
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS stock_ledgers");
    }
};
