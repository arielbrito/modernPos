<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
        return [
            // Reglas para el producto "padre"
            'name'          => ['required', 'string', 'max:255'],
            'slug'          => ['required', 'string', 'max:255', 'unique:products,slug'],
            'description'   => ['nullable', 'string'],
            'category_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'supplier_id'   => ['nullable', 'integer', 'exists:suppliers,id'],
            'type'          => ['required', 'string', 'in:simple,variable'],
            'image'         => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],

            // Reglas para el array de variantes
            'variants'                 => ['required', 'array', 'min:1'],
            'variants.*.sku'           => ['required', 'string', 'max:100', 'distinct', 'unique:product_variants,sku'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price'    => ['required', 'numeric', 'min:0'],
            'variants.*.attributes'    => ['nullable', 'string'],
        ];
    }
}
