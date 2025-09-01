<?php

// En database/migrations/xxxx_create_sale_items_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants');

            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2)->comment('Precio al momento de la venta');
            $table->decimal('total_price', 15, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
