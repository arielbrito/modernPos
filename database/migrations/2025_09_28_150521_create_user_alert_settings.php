<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_alert_settings', function (Blueprint $table) {
            $table->id();

            // Dueño de la configuración
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();

            // Umbrales por defecto
            $table->unsignedInteger('low_stock_threshold')->default(3);
            $table->unsignedInteger('ncf_threshold')->default(50);

            // Canales globales del usuario
            // Ej: ["database","mail","broadcast"]
            $table->jsonb('channels')->default(json_encode(['database']));

            // Overrides por tienda o tipo de alerta (opcional)
            // Ej: {"store_5":{"low_stock_threshold":2,"channels":["database","mail"]}}
            $table->jsonb('overrides')->nullable();

            // Silencios/quiet hours (opcional) Ej: {"start":"22:00","end":"07:00","tz":"America/Santo_Domingo"}
            $table->jsonb('quiet_hours')->nullable();

            // Últimos envíos (para throttling / digest)
            $table->timestampTz('last_low_stock_sent_at')->nullable();
            $table->timestampTz('last_ncf_sent_at')->nullable();

            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_alert_settings');
    }
};
