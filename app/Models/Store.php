<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute; // 1. Importar Attribute
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use App\Policies\StorePolicy;

#[UsePolicy(StorePolicy::class)]
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

    // 👇 accessor moderno; se serializa como "logo_url"
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (!$this->logo) {
                    return null;
                }
                // Si ya guardaste una URL completa o un /storage/... no dupliques prefijo
                if (Str::startsWith($this->logo, ['http://', 'https://', '/storage'])) {
                    return $this->logo;
                }
                // Genera URL pública desde el disco "public"
                return Storage::disk('public')->url($this->logo);
            }
        );
    }

    // 👇 importante: usar snake_case aquí
    protected $appends = ['logo_url'];


    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function registers(): HasMany
    {
        return $this->hasMany(Register::class, 'store_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'store_id'); // por defecto 'store_id'
    }
}
