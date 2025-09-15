<?php

// database/migrations/2025_09_12_091000_add_reorder_point_to_inventories.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $t) {
            if (!Schema::hasColumn('inventory', 'reorder_point')) {
                $t->decimal('reorder_point', 14, 3)->default(0);
            }
        });
    }
    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $t) {
            if (Schema::hasColumn('inventory', 'reorder_point')) {
                $t->dropColumn('reorder_point');
            }
        });
    }
};
