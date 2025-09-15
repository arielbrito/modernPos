<?php

// database/migrations/2025_09_12_090000_create_system_alerts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('system_alerts', function (Blueprint $t) {
            $t->id();
            $t->string('type', 40);              // low_stock | ncf_low | ncf_missing
            $t->string('severity', 12)->default('info'); // info|warning|critical
            $t->string('title', 160);
            $t->text('message')->nullable();
            $t->jsonb('meta')->nullable();       // {store_id, variant_id, ...}
            $t->boolean('is_read')->default(false);
            $t->timestamps();

            $t->index(['type', 'is_read']);
            $t->index(['created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('system_alerts');
    }
};
