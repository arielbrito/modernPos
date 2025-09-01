<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Obtenemos el ID de la categoría desde la ruta (ej. /categories/5)
        $categoryId = $this->route('category')->id;

        return [
            'name'        => ['required', 'string', 'max:255', Rule::unique('categories')->ignore($categoryId)],
            'description' => ['nullable', 'string'],
            'parent_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'slug'        => ['required', 'string', Rule::unique('categories')->ignore($categoryId)],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->name) {
            $this->merge(['slug' => Str::slug($this->name)]);
        }
    }
}
