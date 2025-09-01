<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'rnc',
        'phone',
        'address',
        'email',
        'currency',
        'logo',
        'is_active'
    ];


    public function inventory()
    {
        return $this->hasOne(Inventory::class);
    }
}
