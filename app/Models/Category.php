<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id'
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }


    /**
     * Define la relación inversa (pertenece a) con su categoría padre.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Define la relación uno a muchos consigo mismo para las subcategorías.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}
