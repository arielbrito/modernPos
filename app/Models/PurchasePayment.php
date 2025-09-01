<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchasePayment extends Model
{
    protected $fillable = ['purchase_id', 'method', 'paid_amount', 'paid_at', 'reference', 'notes'];
    protected $casts = ['paid_at' => 'datetime'];
    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }
}
