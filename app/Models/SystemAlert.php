<?php

// app/Models/SystemAlert.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemAlert extends Model
{
    protected $fillable = [
        'type',
        'severity',
        'title',
        'message',
        'meta',
        'is_read',
    ];
    protected $casts = [
        'meta' => 'array',
        'is_read' => 'boolean',
    ];
}
