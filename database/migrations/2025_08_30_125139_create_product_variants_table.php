<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
            $table->boolean('is_taxable')->default(false);
            $table->string('tax_code', 32)->nullable();
            $table->decimal('tax_rate', 6, 4)->nullable();
            $table->decimal('average_cost', 14, 4)->default(0);
            $table->decimal('last_cost', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);

            // --- NUEVO CAMPO ---
            $table->string('image_path')->nullable()->comment('Ruta al archivo de imagen');

            $table->timestamps();

            // $table->index('sku');
            // $table->index('barcode');
        });

        DB::statement("ALTER TABLE product_variants
            ADD CONSTRAINT product_variants_tax_rate_range
            CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1))");
        DB::statement("CREATE INDEX IF NOT EXISTS product_variants_is_taxable_idx ON product_variants (is_taxable)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
