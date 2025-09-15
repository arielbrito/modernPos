<?php

// database/migrations/2025_09_04_170400_create_cash_count_lines_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_count_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('count_id')->constrained('cash_counts')->cascadeOnDelete();
            $t->foreignId('denomination_id')->constrained('cash_denominations')->restrictOnDelete();

            $t->unsignedInteger('quantity');
            $t->decimal('subtotal', 14, 2);
            $t->timestamps();

            $t->unique(['count_id', 'denomination_id']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('cash_count_lines');
    }
};
