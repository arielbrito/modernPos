<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAlertSetting extends Model
{
    protected $table = 'user_alert_settings';

    protected $fillable = [
        'user_id',
        'low_stock_threshold',
        'ncf_threshold',
        'channels',
        'overrides',
        'quiet_hours',
        'last_low_stock_sent_at',
        'last_ncf_sent_at',
    ];

    protected $casts = [
        'channels' => 'array',
        'overrides' => 'array',
        'quiet_hours' => 'array',
        'last_low_stock_sent_at' => 'datetime',
        'last_ncf_sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
