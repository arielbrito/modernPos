<?php

// app/Models/PurchaseEmailLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseEmailLog extends Model
{
    protected $fillable = [
        'purchase_id',
        'user_id',
        'to',
        'cc',
        'subject',
        'queued',
        'status',
        'message_id',
        'error',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }
}
