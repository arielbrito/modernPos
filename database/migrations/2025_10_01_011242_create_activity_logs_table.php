<?php

// database/migrations/2025_09_30_000000_create_activity_logs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $t) {
            $t->id();
            // sujeto polimórfico (Store, Sale, etc.)
            $t->morphs('subject'); // subject_type, subject_id
            // autor (user) opcional
            $t->foreignId('causer_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('event', 64);            // created, updated, deleted, user_assigned, etc.
            $t->string('description')->nullable();
            $t->json('changes')->nullable();    // { old: {...}, new: {...} }
            $t->timestamps();
            $t->index(['subject_type', 'subject_id', 'created_at']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
