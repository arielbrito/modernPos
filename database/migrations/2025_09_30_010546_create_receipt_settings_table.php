<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_settings', function (Blueprint $table) {
            $table->id();
            // Usamos un único registro para toda la configuración, pero podríamos extenderlo por tienda (store_id)
            $table->string('company_name')->default('Mi Negocio');
            $table->string('tax_id')->nullable(); // RNC o ID fiscal
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('logo_path')->nullable(); // Guardaremos la ruta a la imagen del logo
            $table->text('footer_message')->nullable()->comment('Ej: ¡Gracias por su compra!');
            $table->text('terms_and_conditions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_settings');
    }
};
