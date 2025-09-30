<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAlertSetting extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'low_stock_enabled', // Campo que añadiremos
        'ncf_enabled',       // Campo que añadiremos
        'low_stock_threshold',
        'ncf_threshold',
        'channels',
        'overrides',
        'quiet_hours',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'low_stock_enabled' => 'boolean',
        'ncf_enabled'       => 'boolean',
        'channels'          => 'array',
        'overrides'         => 'array',
        'quiet_hours'       => 'array',
    ];

    /**
     * Get the user that owns the settings.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
