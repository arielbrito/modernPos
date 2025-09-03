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
            'name'                  => ['required', 'string', 'max:255'],
            'slug'                  => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'description'           => ['nullable', 'string'],
            'category_id'           => ['nullable', 'exists:categories,id'],
            'supplier_id'           => ['nullable', 'exists:suppliers,id'],
            'type'                  => ['required', 'in:simple,variable'],
            'unit'                  => ['nullable', 'string', 'max:50'],
            'is_active'             => ['boolean'],

            'image'                 => ['nullable', 'image', 'max:2048'],

            'variants'              => ['required', 'array', 'min:1'],
            'variants.*.sku'        => ['required', 'string', 'max:100', 'unique:product_variants,sku'],
            'variants.*.barcode'    => ['nullable', 'string', 'max:100', 'unique:product_variants,barcode'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price'    => ['nullable', 'numeric', 'min:0'],
            'variants.*.attributes'    => ['nullable'], // string o array
        ];
    }
}
