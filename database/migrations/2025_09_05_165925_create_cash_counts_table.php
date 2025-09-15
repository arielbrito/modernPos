<?php

// database/migrations/2025_09_04_170300_create_cash_counts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_counts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shift_id')->constrained('cash_shifts')->cascadeOnDelete();
            $t->enum('type', ['opening', 'closing', 'partial']);
            $t->string('currency_code', 3);
            $t->decimal('total_counted', 14, 2)->default(0);
            $t->foreignId('created_by')->constrained('users');
            $t->timestampTz('created_at')->useCurrent();
            $t->text('note')->nullable();

            $t->foreign('currency_code')
                ->references('code')->on('currencies')
                ->cascadeOnDelete();

            $t->index(['shift_id', 'type', 'currency_code']);
        });

        // Unicidad: solo 1 apertura y 1 cierre por turno/moneda
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS cash_counts_unique_open_close
            ON cash_counts (shift_id, currency_code, type)
            WHERE type IN ('opening','closing')
        ");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS cash_counts_unique_open_close");
        Schema::dropIfExists('cash_counts');
    }
};
