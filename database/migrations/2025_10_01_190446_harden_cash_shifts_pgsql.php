<?php

// database/migrations/2025_10_01_120000_harden_cash_shifts_pgsql.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // status válido
        DB::statement("ALTER TABLE cash_shifts
            ADD CONSTRAINT cash_shifts_status_chk CHECK (status IN ('open','closed'))");

        // único turno abierto por register (status='open' y closed_at IS NULL)
        DB::statement("CREATE UNIQUE INDEX cash_shifts_one_open_per_register_idx
            ON cash_shifts (register_id)
            WHERE status = 'open' AND closed_at IS NULL");

        // índices útiles
        DB::statement("CREATE INDEX IF NOT EXISTS cash_counts_shift_type_idx
            ON cash_counts (shift_id, type)");
        DB::statement("CREATE INDEX IF NOT EXISTS cash_movements_shift_ccy_idx
            ON cash_movements (shift_id, currency_code)");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS cash_shifts_one_open_per_register_idx");
        DB::statement("ALTER TABLE cash_shifts DROP CONSTRAINT IF EXISTS cash_shifts_status_chk");
        DB::statement("DROP INDEX IF EXISTS cash_counts_shift_type_idx");
        DB::statement("DROP INDEX IF EXISTS cash_movements_shift_ccy_idx");
    }
};
