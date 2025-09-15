<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --- TAXES ---
        Schema::create('taxes', function (Blueprint $t) {
            $t->string('code', 20)->primary();   // ITBIS18, EXEMPT
            $t->string('name');
            $t->decimal('rate', 6, 4);           // 0.1800, 0.0000
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        DB::table('taxes')->upsert([
            ['code' => 'ITBIS18', 'name' => 'ITBIS 18%', 'rate' => 0.1800, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'EXEMPT',  'name' => 'Exento',     'rate' => 0.0000, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'rate', 'active', 'updated_at']);

        // --- NCF TYPES ---
        Schema::create('ncf_types', function (Blueprint $t) {
            $t->string('code', 10)->primary(); // B02, B01, etc.
            $t->string('name');
            $t->timestamps();
        });

        DB::table('ncf_types')->upsert([
            ['code' => 'B02', 'name' => 'Consumidor Final', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'B01', 'name' => 'Crédito Fiscal',   'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'updated_at']);

        // --- NCF SEQUENCES ---
        Schema::create('ncf_sequences', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained()->cascadeOnDelete();
            $t->string('ncf_type_code', 10);             // FK a ncf_types
            $t->string('prefix', 20)->nullable();        // ej. B02
            $t->bigInteger('next_number');               // correlativo siguiente
            $t->bigInteger('end_number')->nullable();    // límite opcional
            $t->unsignedTinyInteger('pad_length')->default(8);
            $t->boolean('active')->default(true);
            $t->timestamps();

            $t->foreign('ncf_type_code')->references('code')->on('ncf_types');

            $t->unique(['store_id', 'ncf_type_code']);
            $t->index(['store_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ncf_sequences');
        Schema::dropIfExists('ncf_types');
        Schema::dropIfExists('taxes');
    }
};
