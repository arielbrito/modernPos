<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_adjustment_id')->constrained('inventory_adjustments')->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->unique(['inventory_adjustment_id', 'product_variant_id']);
            $table->decimal('quantity', 12, 2)->comment('La cantidad que se ajusta (siempre positiva)');
            $table->decimal('previous_quantity', 12, 2)->comment('Stock que había antes del ajuste');
            $table->decimal('new_quantity', 12, 2)->comment('Stock que quedó después del ajuste');
            $table->decimal('cost', 14, 4)->comment('Costo promedio del producto al momento del ajuste');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_adjustment_items');
    }
};
