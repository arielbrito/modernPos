<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute; // 1. Importar Attribute
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage; // 2. Importar Storage

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = ['produc_id', 'sku', 'barcode', 'attributes', 'cost_price', 'selling_price', 'image_path'];

    protected $casts = [
        'attributes' => 'array', // Para que Laravel trate el JSON como un array
    ];

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->image_path
                ? Storage::disk('public')->url($this->image_path)
                : null,
        );
    }

    // --- CÓDIGO A AÑADIR (Parte 2: La Propiedad $appends) ---
    /**
     * Asegúrate de que imageUrl se incluya siempre que el modelo se convierta a array/JSON.
     */
    protected $appends = ['image_url'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function inventory()
    {
        return $this->hasMany(Inventory::class);
    }
}
