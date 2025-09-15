<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dgii_taxpayers', function (Blueprint $t) {
            $t->id();
            $t->enum('doc_type', ['RNC', 'CED']);         // mayormente RNC
            $t->string('doc_number', 32);                // como viene
            $t->string('doc_number_norm', 32)->index();  // solo dígitos
            $t->string('name');
            $t->string('status')->nullable();            // ACTIVO / etc.
            $t->boolean('is_taxpayer')->default(true);
            $t->jsonb('raw')->nullable();
            $t->date('padron_date')->nullable();
            $t->string('source_version')->nullable();
            $t->timestamps();

            $t->unique(['doc_type', 'doc_number_norm']);
            $t->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dgii_taxpayers');
    }
};
