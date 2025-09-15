<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_line_taxes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_line_id')->constrained('sale_lines')->cascadeOnDelete();

            $t->string('tax_code', 20);
            $t->string('tax_name');
            $t->decimal('tax_rate', 6, 4);     // 0.1800
            $t->decimal('taxable_amount', 14, 2)->default(0);
            $t->decimal('tax_amount',    14, 2)->default(0);

            $t->timestamps();

            $t->index(['sale_line_id']);
            $t->index(['tax_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_line_taxes');
    }
};
