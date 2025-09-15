<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_taxes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();

            $t->string('tax_code', 20);
            $t->string('tax_name');
            $t->decimal('tax_rate', 6, 4);
            $t->decimal('taxable_amount', 14, 2)->default(0);
            $t->decimal('tax_amount',    14, 2)->default(0);

            $t->timestamps();

            $t->unique(['sale_id', 'tax_code']); // 1 fila por impuesto/venta
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_taxes');
    }
};
