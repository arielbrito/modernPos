<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DgiiTaxpayer extends Model
{
    protected $fillable = [
        'doc_type',
        'doc_number',
        'doc_number_norm',
        'name',
        'status',
        'is_taxpayer',
        'raw',
        'padron_date',
        'source_version',
    ];

    protected $casts = [
        'is_taxpayer' => 'boolean',
        'padron_date' => 'date',
        'raw' => 'array',
    ];

    // Scope simple por documento (normalizado)
    public function scopeByDoc($q, string $type, string $doc): void
    {
        $norm = preg_replace('/\D+/', '', $doc);
        $q->where('doc_type', $type)->where('doc_number_norm', $norm);
    }
}
