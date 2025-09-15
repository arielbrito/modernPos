<?php

// database/migrations/2025_09_04_170200_create_cash_shifts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_shifts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('register_id')->constrained('registers')->cascadeOnDelete();
            $t->foreignId('opened_by')->constrained('users');
            $t->foreignId('closed_by')->nullable()->constrained('users');

            $t->timestampTz('opened_at');
            $t->timestampTz('closed_at')->nullable();

            $t->string('status', 20)->default('open'); // open | closed
            $t->text('opening_note')->nullable();
            $t->text('closing_note')->nullable();
            $t->jsonb('meta')->nullable();

            $t->timestamps();

            $t->index(['register_id', 'status']);
        });

        // Solo 1 turno abierto por caja
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS cash_shifts_one_open_per_register
            ON cash_shifts (register_id)
            WHERE status = 'open' AND closed_at IS NULL
        ");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS cash_shifts_one_open_per_register");
        Schema::dropIfExists('cash_shifts');
    }
};
