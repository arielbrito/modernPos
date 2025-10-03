<?php

// database/migrations/2025_10_01_170000_index_product_stock_movements.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('product_stock_movements', function (Blueprint $t) {
            $t->index(['store_id', 'product_variant_id', 'created_at'], 'psm_store_variant_created_idx');
        });
    }
    public function down(): void
    {
        Schema::table('product_stock_movements', function (Blueprint $t) {
            $t->dropIndex('psm_store_variant_created_idx');
        });
    }
};
