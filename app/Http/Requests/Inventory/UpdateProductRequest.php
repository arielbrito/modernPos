<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class UpdateProductRequest extends FormRequest
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
        $productId = $this->route('product')->id;

        $rules = [
            'name'          => ['required', 'string', 'max:255'],
            'slug'          => ['required', 'string', 'max:255', Rule::unique('products')->ignore($productId)],
            'description'   => ['nullable', 'string'],
            'category_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'type'          => ['required', 'string', 'in:simple,variable'],
            'image'         => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],

            // Reglas para el array de variantes
            'variants'                 => ['required', 'array', 'min:1'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price'    => ['required', 'numeric', 'min:0'],
            'variants.*.attributes'    => ['nullable', 'string'],
        ];

        // Añadir reglas de SKU únicas para cada variante dinámicamente
        foreach ($this->input('variants', []) as $index => $variant) {
            // El 'id' de la variante solo existirá si es una variante preexistente
            $variantId = $variant['id'] ?? null;

            $rules["variants.{$index}.sku"] = [
                'required',
                'string',
                'max:100',
                'distinct', // Único dentro del array enviado
                Rule::unique('product_variants', 'sku')->ignore($variantId) // Único en la DB, ignorando la propia variante
            ];
        }

        return $rules;
    }

    protected function prepareForValidation(): void
    {
        if ($this->name) {
            $this->merge(['slug' => Str::slug($this->name)]);
        }
    }
}
