<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreCategoryRequest;
use App\Http\Requests\Inventory\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // 1. Datos paginados para la tabla principal
        $paginatedCategories = Category::with('parent')->latest()->paginate(10);

        // 2. Lista completa para el selector de "categoría padre"
        $allCategories = Category::all(['id', 'name']);

        return Inertia::render('inventory/categories/index', [
            'categories' => $paginatedCategories,
            'allCategories' => $allCategories, // Enviamos la lista completa
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCategoryRequest $request)
    { {
            // La validación y la creación del slug ya ocurrieron
            Category::create($request->validated());

            return redirect()->route('inventory.categories.index')->with('success', 'Categoría creada exitosamente.');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());
        return to_route('inventory.categories.index')->with('success', 'Categoría actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Category $category)
    {
        // Lógica de seguridad: Prevenir eliminación si tiene productos asociados.
        if ($category->products()->exists()) {
            return to_route('inventory.categories.index')
                ->with('error', 'No se puede eliminar la categoría porque tiene productos asociados.');
        }

        $category->delete();
        return to_route('inventory.categories.index')->with('success', 'Categoría eliminada.');
    }
}
