<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder; // Importar Builder
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'barcode',
        'attributes',
        'cost_price',
        'selling_price',
        'is_taxable',
        'tax_code',
        'tax_rate',
        'average_cost',
        'last_cost',
        'image_path',
        'is_active'
    ];

    protected $casts = [
        'attributes' => 'array',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'average_cost' => 'decimal:4',
        'last_cost' => 'decimal:4',
        'is_active' => 'boolean',
        'is_taxable' => 'boolean',
        'tax_rate' => 'decimal:4', // Usar decimal en lugar de float para precisión monetaria
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
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'product_variant_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class, 'product_variant_id');
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class, 'product_variant_id');
    }

    protected function stock(): Attribute
    {
        // Aplica cuando 'stock' viene de withSum; convierte null -> 0
        return Attribute::make(
            get: fn($value) => (int) ($value ?? 0)
        );
    }

    public function isTaxable(): bool
    {
        return $this->is_taxable;
    }
}
