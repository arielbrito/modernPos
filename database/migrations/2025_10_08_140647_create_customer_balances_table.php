<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('customer_balances', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $t->decimal('balance', 14, 2)->default(0); // >0 a favor del cliente
            $t->timestamps();
        });

        Schema::create('customer_balance_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_balance_id')->constrained()->cascadeOnDelete();
            $t->date('entry_date');
            $t->enum('direction', ['credit', 'debit']); // credit: aumenta favor cliente
            $t->decimal('amount', 14, 2);
            $t->string('reason', 60)->nullable(); // 'sale_return', 'consumption', etc.
            $t->morphs('source');
            $t->jsonb('meta')->nullable();
            $t->timestamps();

            $t->index(['customer_balance_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_balance_entries');
        Schema::dropIfExists('customer_balances');
    }
};
