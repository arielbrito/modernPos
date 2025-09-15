<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $t->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();

            // Snapshot del artículo
            $t->string('sku')->nullable();
            $t->string('name');
            $t->jsonb('attributes')->nullable();

            $t->decimal('qty', 14, 3);
            $t->decimal('unit_price', 14, 2);
            $t->decimal('discount_percent', 5, 2)->default(0);
            $t->decimal('discount_amount', 14, 2)->default(0);
            $t->string('tax_code', 20)->nullable();
            $t->string('tax_name')->nullable();
            $t->decimal('tax_rate', 6, 4)->default(0);
            $t->decimal('tax_amount', 14, 2)->default(0);

            // Totales de línea
            $t->decimal('total_ex_tax', 14, 2)->default(0); // qty * price - desc
            $t->decimal('line_total', 14, 2);                 // total_ex_tax + sum(tax_amount) de sale_line_taxes

            $t->foreignId('parent_line_id')->nullable()->constrained('sale_lines')->nullOnDelete();
            $t->timestamps();

            $t->index(['sale_id']);
            $t->index(['variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_lines');
    }
};
