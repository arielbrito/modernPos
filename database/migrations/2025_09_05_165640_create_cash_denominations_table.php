<?php

// database/migrations/2025_09_04_170100_create_cash_denominations_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_denominations', function (Blueprint $t) {
            $t->id();
            $t->string('currency_code', 3);
            $t->decimal('value', 14, 2);
            $t->enum('kind', ['bill', 'coin']);
            $t->boolean('active')->default(true);
            $t->unsignedSmallInteger('position')->default(0);
            $t->timestamps();

            $t->foreign('currency_code')
                ->references('code')->on('currencies')
                ->cascadeOnDelete();

            $t->unique(['currency_code', 'value']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('cash_denominations');
    }
};
