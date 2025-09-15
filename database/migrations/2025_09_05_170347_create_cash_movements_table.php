<?php

// database/migrations/2025_09_04_170500_create_cash_movements_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shift_id')->constrained('cash_shifts')->cascadeOnDelete();
            $t->enum('direction', ['in', 'out']);
            $t->string('currency_code', 3);
            $t->decimal('amount', 14, 2);
            $t->string('reason', 40)->nullable();    // sale, refund, drop, payout, adjust...
            $t->string('reference', 80)->nullable(); // #doc/nota
            $t->foreignId('created_by')->constrained('users');
            $t->timestampTz('created_at')->useCurrent();
            $t->jsonb('meta')->nullable();

            $t->nullableMorphs('source');

            $t->foreign('currency_code')
                ->references('code')->on('currencies')
                ->cascadeOnDelete();

            $t->index(['shift_id', 'currency_code', 'created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
