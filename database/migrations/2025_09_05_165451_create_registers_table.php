<?php

// database/migrations/2025_09_04_170000_create_registers_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('registers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $t->string('name');
            $t->boolean('active')->default(true);
            $t->timestamps();

            $t->unique(['store_id', 'name']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('registers');
    }
};
