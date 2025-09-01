<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $guarded = []; // O usa $fillable con los campos que definimos

    /**
     * Define la relación uno a muchos con los items de la venta.
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    // Aquí irían otras relaciones como user(), client(), store()...
}
