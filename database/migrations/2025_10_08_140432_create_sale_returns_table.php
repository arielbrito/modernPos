<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('currency_code', 3)->default('DOP');
            $t->decimal('total_refund', 14, 2)->default(0);
            $t->decimal('cost_refund', 14, 2)->default(0);
            $t->decimal('subtotal_refund', 14, 2)->default(0);
            $t->decimal('tax_refund', 14, 2)->default(0);
            $t->decimal('discount_refund', 14, 2)->default(0);
            $t->text('reason')->nullable();
            $t->jsonb('meta')->nullable();
            $t->timestamps();
            $t->foreign('currency_code')->references('code')->on('currencies')->cascadeOnDelete();
            $t->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $t->index(['sale_id', 'created_at']);
        });

        Schema::create('sale_return_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_return_id')->constrained('sale_returns')->cascadeOnDelete();
            $t->foreignId('sale_line_id')->constrained('sale_lines')->cascadeOnDelete();
            $t->decimal('qty', 14, 3);
            $t->decimal('refund_amount', 14, 2);
            $t->decimal('subtotal_part', 14, 2);
            $t->decimal('tax_part', 14, 2)->default(0);
            $t->decimal('discount_part', 14, 2)->default(0);
            $t->text('reason')->nullable();
            $t->timestamps();

            $t->unique(['sale_return_id', 'sale_line_id']); // 1 línea por return (puedes permitir múltiple si prefieres)
            $t->index(['sale_line_id']);
        });

        Schema::create('sale_return_taxes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_return_id')->constrained('sale_returns')->cascadeOnDelete();
            $t->string('tax_code', 20); // ej: ITBIS
            $t->decimal('base_amount', 14, 2);
            $t->decimal('tax_amount', 14, 2);
            $t->timestamps();
            $t->unique(['sale_return_id', 'tax_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_lines');
        Schema::dropIfExists('sale_returns');
        Schema::dropIfExists('sale_returns_taxes');
    }
};
