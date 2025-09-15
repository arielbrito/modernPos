<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Búsqueda y reportes
        DB::statement('CREATE INDEX IF NOT EXISTS sales_store_occurred_idx ON sales (store_id, occurred_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS sales_status_idx ON sales (status)');
        DB::statement('CREATE INDEX IF NOT EXISTS sale_lines_variant_idx ON sale_lines (variant_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS sale_payments_sale_idx ON sale_payments (sale_id)');

        // Unicidad NCF sólo si ambos no son null
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS sales_ncf_unique
            ON sales (store_id, ncf_type, ncf_number)
            WHERE ncf_type IS NOT NULL AND ncf_number IS NOT NULL
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS sales_store_occurred_idx');
        DB::statement('DROP INDEX IF EXISTS sales_status_idx');
        DB::statement('DROP INDEX IF EXISTS sale_lines_variant_idx');
        DB::statement('DROP INDEX IF EXISTS sale_payments_sale_idx');
        DB::statement('DROP INDEX IF EXISTS sales_ncf_unique');
    }
};
