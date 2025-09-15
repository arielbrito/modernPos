<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $t) {
            $t->id();
            $t->string('code')->unique();                 // CUST-000001
            $t->string('name');                           // Razón social o nombre
            $t->enum('kind', ['person', 'company'])->default('company');
            $t->enum('document_type', ['RNC', 'CED', 'NONE'])->default('NONE');
            $t->string('document_number')->nullable();    // RNC o cédula
            $t->string('email')->nullable();
            $t->string('phone')->nullable();
            $t->string('address')->nullable();
            $t->boolean('is_taxpayer')->default(false);   // pertenece al padrón DGII
            $t->boolean('is_generic')->default(false);   // pertenece al padrón DGII
            $t->boolean('active')->default(true);

            // Crédito
            $t->boolean('allow_credit')->default(false);
            $t->decimal('credit_limit', 14, 2)->default(0);
            $t->unsignedSmallInteger('credit_terms_days')->default(0);
            $t->decimal('balance', 14, 2)->default(0);

            $t->timestamps();

            // Índices básicos (el “tune” añadirá índices avanzados/únicos parciales)
            $t->index('name');
            $t->index('document_number');
            $t->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
