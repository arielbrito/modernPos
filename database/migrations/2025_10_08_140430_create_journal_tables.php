<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $t) {
            $t->id();
            $t->date('entry_date');
            $t->string('currency_code', 3)->default('DOP');
            $t->string('type', 40)->index(); // 'sale_return', etc.
            $t->string('reference')->nullable(); // p.ej. sale number / return number
            $t->morphs('source'); // source_type, source_id (SaleReturn, etc.)
            $t->jsonb('meta')->nullable();
            $t->timestamps();

            $t->foreign('currency_code')->references('code')->on('currencies')->cascadeOnDelete();
        });

        Schema::create('journal_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $t->string('account_code', 32)->index();
            $t->enum('dc', ['D', 'C']); // Debe / Haber
            $t->decimal('amount', 14, 2);
            $t->string('memo')->nullable();
            $t->jsonb('meta')->nullable();
            $t->timestamps();

            $t->index(['journal_entry_id', 'account_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
    }
};
