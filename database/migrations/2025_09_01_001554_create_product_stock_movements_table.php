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
        Schema::create('product_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['purchase_entry', 'sale_exit', 'adjustment_in', 'adjustment_out']);
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('subtotal', 14, 2);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Polimorfismo para vincular el movimiento a su origen (una compra, una venta, etc.)
            $table->morphs('source'); // Crea source_id y source_type

            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_stock_movements');
    }
};
