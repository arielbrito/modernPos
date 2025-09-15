<?php

namespace App\Models;

use App\Enums\ProductNature; // 1. Importar Enums
use App\Enums\ProductType;
use Illuminate\Database\Eloquent\Builder; // 2. Importar Builder para Scopes
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'product_nature',
        'category_id',
        'supplier_id',
        'type',
        'unit',
        'is_active'
    ];

    /**
     * 3. Casting de Atributos Mejorado
     * - `is_active` a booleano.
     * - `product_nature` y `type` a sus respectivos Enums.
     */
    protected $casts = [
        'is_active' => 'boolean',
        'product_nature' => ProductNature::class,
        'type' => ProductType::class,
    ];

    // --- RELACIONES ---

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    // --- SCOPES ---

    /**
     * 4. Query Scope para productos activos.
     * Permite hacer consultas como: Product::active()->get();
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    // --- MÉTODOS AUXILIARES ---

    /**
     * 5. Helpers para una lógica de negocio más legible.
     * Permite hacer: if ($product->isService()) { ... }
     */
    public function isService(): bool
    {
        return $this->product_nature === ProductNature::SERVICE;
    }

    public function isStockable(): bool
    {
        return $this->product_nature === ProductNature::STOCKABLE;
    }

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            // Si el slug no se ha definido manualmente, lo genera a partir del nombre.
            if (! $product->slug) {
                $product->slug = Str::slug($product->name);
            }
        });
    }
}
