<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
            $table->decimal('qty_ordered', 12, 2);
            $table->decimal('qty_received', 12, 2)->default(0);
            $table->decimal('qty_returned', 12, 2)->default(0)->after('qty_received');
            $table->decimal('unit_cost', 14, 4); // costo base sin impuestos
            $table->decimal('discount_pct', 6, 3)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('tax_pct', 6, 3)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('landed_cost_alloc', 14, 4)->default(0); // prorrateo flete/otros
            $table->decimal('line_total', 14, 2); // total final de la línea
            $table->timestamps();

            $table->index(['purchase_id', 'product_variant_id']);

            $table->index('product_variant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
    }
};
