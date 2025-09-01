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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('kind', ['person', 'company'])->default('company');
            $table->enum('document_type', ['RNC', 'CED', 'NONE'])->default('NONE');
            $table->string('document_number')->nullable()->index(); // RNC o cédula
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->boolean('is_taxpayer')->default(false);      // pertenece al padrón DGII
            $table->boolean('active')->default(true);

            // Crédito
            $table->boolean('allow_credit')->default(false);
            $table->decimal('credit_limit', 14, 2)->default(0);
            $table->unsignedSmallInteger('credit_terms_days')->default(0);
            $table->decimal('balance', 14, 2)->default(0);       // opcional (puedes lle
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
