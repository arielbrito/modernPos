<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('to');
            $table->string('cc')->nullable();
            $table->string('subject');
            $table->boolean('queued')->default(true);

            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->string('message_id')->nullable();
            $table->text('error')->nullable();

            $table->timestamps();

            $table->index(['purchase_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_email_logs');
    }
};
