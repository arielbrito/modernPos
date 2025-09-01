<?php

// En database/migrations/xxxx_create_sales_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('client_id')->nullable()->constrained('clients');

            $table->decimal('total_amount', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('final_amount', 15, 2);

            $table->enum('payment_method', ['cash', 'card', 'transfer', 'other']);
            $table->enum('status', ['completed', 'pending', 'cancelled'])->default('completed');

            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
