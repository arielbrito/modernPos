<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Único parcial: (document_type, document_number) solo cuando aplica
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS customers_doc_unique
            ON customers (document_type, document_number)
            WHERE document_type <> 'NONE'
              AND document_number IS NOT NULL
              AND document_number <> ''
        ");

        // Índices de apoyo (si no existen)
        DB::statement("CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (name)");
        DB::statement("CREATE INDEX IF NOT EXISTS customers_code_idx ON customers (code)");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS customers_doc_unique");
        DB::statement("DROP INDEX IF EXISTS customers_name_idx");
        DB::statement("DROP INDEX IF EXISTS customers_code_idx");
    }
};
