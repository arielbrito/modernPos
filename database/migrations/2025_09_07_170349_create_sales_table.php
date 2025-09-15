<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $t) {
            $t->id();

            // Número correlativo (único por tienda, NO global)
            $t->string('number');
            $t->foreignId('store_id')->constrained()->cascadeOnDelete();
            $t->unique(['store_id', 'number']); // <- clave única correcta
            $t->index('number'); // útil para búsquedas rápidas por número

            // Facturar a (snapshot)
            $t->string('bill_to_name');
            $t->string('bill_to_doc_type', 4);      // 'RNC' | 'CED' | 'NONE'
            $t->string('bill_to_doc_number', 32)->nullable();
            $t->boolean('bill_to_is_taxpayer')->default(false);

            $t->foreignId('register_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('shift_id')->constrained('cash_shifts')->cascadeOnDelete();

            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();

            $t->string('currency_code', 3)->default('DOP');
            $t->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();

            $t->decimal('fx_rate_to_store', 16, 8)->nullable();
            $t->decimal('subtotal', 14, 2)->default(0);
            $t->decimal('discount_total', 14, 2)->default(0);
            $t->decimal('tax_total', 14, 2)->default(0);
            $t->decimal('rounding_total', 14, 2)->default(0);
            $t->decimal('total', 14, 2)->default(0);
            $t->decimal('paid_total', 14, 2)->default(0);
            $t->decimal('due_total', 14, 2)->default(0);

            $t->string('ncf_type', 10)->nullable();
            $t->string('ncf_number', 50)->nullable();
            $t->timestampTz('ncf_emitted_at')->nullable();

            $t->enum('status', ['draft', 'on_hold', 'completed', 'void', 'refunded'])->default('completed');

            $t->foreignId('parent_sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $t->timestampTz('voided_at')->nullable();
            $t->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('void_reason')->nullable();

            $t->timestampTz('refunded_at')->nullable();
            $t->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('refund_reason')->nullable();

            $t->timestampTz('occurred_at')->useCurrent();
            $t->jsonb('meta')->nullable();
            $t->timestamps();

            // Índices frecuentes
            $t->index(['store_id', 'occurred_at']);
            $t->index(['customer_id']);
            $t->index(['status']);
            $t->index(['bill_to_doc_type', 'bill_to_doc_number']); // búsqueda por doc
        });

        // NCF único por tienda + tipo + número (si no nulos)
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS sales_ncf_unique
            ON sales (store_id, ncf_type, ncf_number)
            WHERE ncf_type IS NOT NULL AND ncf_number IS NOT NULL
        ");

        // Índice por expresión (doc normalizado sólo dígitos) – útil para LIKE flexibles
        DB::statement("
            CREATE INDEX IF NOT EXISTS sales_bill_to_doc_norm_idx
            ON sales (regexp_replace(bill_to_doc_number, '[^0-9]', '', 'g'))
            WHERE bill_to_doc_number IS NOT NULL
        ");

        // CHECKs de integridad de 'bill_to'
        DB::statement("
            ALTER TABLE sales
            ADD CONSTRAINT sales_bill_to_doctype_chk
            CHECK (bill_to_doc_type IN ('RNC','CED','NONE'))
        ");

        DB::statement("
            ALTER TABLE sales
            ADD CONSTRAINT sales_bill_to_none_rules_chk
            CHECK (
              (bill_to_doc_type <> 'NONE')
              OR (bill_to_doc_type = 'NONE' AND bill_to_doc_number IS NULL AND bill_to_is_taxpayer = FALSE)
            )
        ");

        DB::statement("
            ALTER TABLE sales
            ADD CONSTRAINT sales_bill_to_taxpayer_chk
            CHECK (
              (bill_to_is_taxpayer = FALSE)
              OR (bill_to_is_taxpayer = TRUE AND bill_to_doc_type = 'RNC')
            )
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS sales_bill_to_doc_norm_idx');
        DB::statement('DROP INDEX IF EXISTS sales_ncf_unique');

        Schema::dropIfExists('sales');
    }
};
