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

        return [
            'name'        => ['required', 'string', 'max:255'],
            'slug'        => ['nullable', 'string', 'max:255', "unique:products,slug,{$productId}"],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'type'        => ['required', 'in:simple,variable'],
            'unit'        => ['nullable', 'string', 'max:50'],
            'is_active'   => ['boolean'],

            'image'       => ['nullable', 'image', 'max:2048'],

            'variants'    => ['required', 'array', 'min:1'],
            'variants.*.id'            => ['nullable', 'exists:product_variants,id'],
            'variants.*.sku'           => [
                'required',
                'string',
                'max:100',
                function ($attr, $value, $fail) use ($productId) {
                    // Permitir el mismo SKU si es de la misma variante o cambiar a otro único
                    $exists = \App\Models\ProductVariant::where('sku', $value)
                        ->whereHas('product', fn($q) => $q->where('id', '!=', $productId))
                        ->exists();
                    if ($exists) $fail('El SKU ya está en uso.');
                }
            ],
            'variants.*.barcode'       => ['nullable', 'string', 'max:100'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price'    => ['nullable', 'numeric', 'min:0'],
            'variants.*.attributes'    => ['nullable'],
        ];
    }


    protected function prepareForValidation(): void
    {
        if ($this->name) {
            $this->merge(['slug' => Str::slug($this->name)]);
        }
    }
}
