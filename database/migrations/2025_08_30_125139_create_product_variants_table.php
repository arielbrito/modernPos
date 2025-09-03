<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/xxxx_xx_xx_xxxxxx_create_product_variants_table.php
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('sku')->unique()->comment('Stock Keeping Unit');
            $table->string('barcode')->nullable()->unique()->comment('Código de barras (UPC, EAN, etc.)');

            $table->jsonb('attributes')->nullable();

            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2);
            $table->decimal('average_cost', 14, 4)->default(0);
            $table->decimal('last_cost', 14, 4)->default(0);

            // --- NUEVO CAMPO ---
            $table->string('image_path')->nullable()->comment('Ruta al archivo de imagen');

            $table->timestamps();

            // $table->index('sku');
            // $table->index('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
