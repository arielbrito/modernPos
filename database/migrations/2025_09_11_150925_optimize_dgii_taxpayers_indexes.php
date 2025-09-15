<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Necesario para poder usar CREATE INDEX CONCURRENTLY en Postgres.
     * (No se permiten dentro de transacciones.)
     */
    public $withinTransaction = false;

    public function up(): void
    {
        // Asegura extensión para trigram (si no está)
        DB::statement("CREATE EXTENSION IF NOT EXISTS pg_trgm");

        // 1) Columna normalizada (si no existe)
        if (! Schema::hasColumn('dgii_taxpayers', 'doc_number_norm')) {
            Schema::table('dgii_taxpayers', function (Blueprint $t) {
                $t->string('doc_number_norm', 32)->nullable()->after('doc_number');
            });

            // 2) Backfill: normaliza lo existente (solo dígitos)
            DB::statement("
                UPDATE dgii_taxpayers
                   SET doc_number_norm = NULLIF(regexp_replace(COALESCE(doc_number, ''), '[^0-9]', '', 'g'), '')
                 WHERE doc_number_norm IS NULL
            ");
        }

        // 3) Índices (CONCURRENTLY) — idempotentes
        DB::statement("
            CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS dgii_taxpayers_doc_unique
                ON dgii_taxpayers (doc_type, doc_number_norm)
             WHERE doc_number_norm IS NOT NULL
               AND doc_number_norm <> ''
        ");

        DB::statement("
            CREATE INDEX CONCURRENTLY IF NOT EXISTS dgii_taxpayers_doc_norm_idx
                ON dgii_taxpayers (doc_number_norm)
        ");

        DB::statement("
            CREATE INDEX CONCURRENTLY IF NOT EXISTS dgii_taxpayers_doc_raw_idx
                ON dgii_taxpayers (doc_number)
        ");

        DB::statement("
            CREATE INDEX CONCURRENTLY IF NOT EXISTS dgii_taxpayers_name_trgm_idx
                ON dgii_taxpayers
             USING gin (name gin_trgm_ops)
        ");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS dgii_taxpayers_name_trgm_idx");
        DB::statement("DROP INDEX IF EXISTS dgii_taxpayers_doc_raw_idx");
        DB::statement("DROP INDEX IF EXISTS dgii_taxpayers_doc_norm_idx");
        DB::statement("DROP INDEX IF EXISTS dgii_taxpayers_doc_unique");

        if (Schema::hasColumn('dgii_taxpayers', 'doc_number_norm')) {
            Schema::table('dgii_taxpayers', function (Blueprint $t) {
                $t->dropColumn('doc_number_norm');
            });
        }
    }
};
