<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Columna normalizada (si no existe)
        if (! Schema::hasColumn('customers', 'document_number_norm')) {
            Schema::table('customers', function (Blueprint $t) {
                $t->string('document_number_norm', 32)->nullable()->after('document_number');
            });

            // 2) Backfill: normaliza lo existente (quita separadores)
            // - Solo números para CED/RNC. Si quieres conservar letras, cambia la expresión.
            DB::statement("
                UPDATE customers
                   SET document_number_norm = NULLIF(regexp_replace(COALESCE(document_number, ''), '[^0-9]', '', 'g'), '')
                 WHERE document_number_norm IS NULL
            ");
        }

        // 3) Índices idempotentes (PostgreSQL)
        // Usa SIEMPRE los mismos nombres para que IF NOT EXISTS surta efecto.
        DB::statement('CREATE INDEX IF NOT EXISTS customers_name_index ON customers (name)');
        DB::statement('CREATE INDEX IF NOT EXISTS customers_document_number_index ON customers (document_number)');
        DB::statement('CREATE INDEX IF NOT EXISTS customers_document_number_norm_index ON customers (document_number_norm)');
    }

    public function down(): void
    {
        // Borra índices si existen
        DB::statement('DROP INDEX IF EXISTS customers_document_number_norm_index');
        DB::statement('DROP INDEX IF EXISTS customers_document_number_index');
        DB::statement('DROP INDEX IF EXISTS customers_name_index');

        // Borra la columna si existe
        if (Schema::hasColumn('customers', 'document_number_norm')) {
            Schema::table('customers', function (Blueprint $t) {
                $t->dropColumn('document_number_norm');
            });
        }
    }
};
