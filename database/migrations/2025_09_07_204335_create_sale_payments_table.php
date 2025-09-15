<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $t->enum('method', ['cash', 'card', 'transfer', 'wallet', 'credit', 'coupon', 'other'])->index();

            $t->string('currency_code', 3)->default('DOP');

            $t->foreign('currency_code')->references('code')->on('currencies')->restrictOnDelete();

            $t->decimal('amount', 14, 2);
            $t->decimal('fx_rate_to_sale', 16, 8)->nullable();
            $t->decimal('tendered_amount', 14, 2)->nullable();
            $t->decimal('change_amount', 14, 2)->nullable();
            $t->string('change_currency_code', 3)->nullable();
            // --- CAMPOS RECOMENDADOS AÑADIDOS ---

            // Para transferencias y pagos con tarjeta.
            $t->string('bank_name', 100)->nullable()->comment('Nombre del banco emisor o de la transferencia.');

            // Específico para pagos con tarjeta.
            $t->string('card_brand', 50)->nullable()->comment('Marca de la tarjeta: Visa, Mastercard, Amex, etc.');
            $t->string('card_last4', 4)->nullable()->comment('Últimos 4 dígitos de la tarjeta para identificación.');

            // Campo 'reference' ahora es más específico.
            $t->string('reference', 120)->nullable()->comment('Código de confirmación, número de cheque, ID de transacción, etc.');

            $t->jsonb('meta')->nullable();
            $t->timestamps();

            $t->index(['sale_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_payments');
    }
};
