<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator; // <-- Importar Validator

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'unit' => $this->input('unit') ?: 'Unidad',
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'description' => ['nullable', 'string'],
            'product_nature' => ['required', Rule::in(['stockable', 'service'])],
            'category_id' => ['nullable', 'exists:categories,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id', Rule::requiredIf($this->input('product_nature') === 'stockable')],
            'type' => ['required', 'in:simple,variable'],
            'unit' => ['required', 'string', 'max:50'],
            'is_active' => ['boolean'],
            'image' => ['nullable', 'image', 'max:2048'],

            'variants' => ['required', 'array', 'min:1'],
            'variants.*.sku' => ['required', 'string', 'max:100', 'distinct:ignore_case', 'unique:product_variants,sku'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100', 'distinct', 'unique:product_variants,barcode'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.attributes' => ['nullable'],
            'variants.*.image' => ['nullable', 'image', 'max:2048'],

            // --- REGLAS BASE AÑADIDAS ---
            'variants.*.is_taxable' => ['sometimes', 'boolean'],
            'variants.*.tax_code'   => ['nullable', 'string', 'max:32'],
            'variants.*.tax_rate'   => ['nullable', 'numeric', 'min:0', 'max:1'], // Tasa entre 0 y 1 (0% a 100%)
        ];
    }

    /**
     * Añade validación condicional para los campos de impuestos.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            foreach ($this->input('variants', []) as $index => $variant) {
                // Usamos filter_var para una validación de booleano robusta desde un request.
                $isTaxable = filter_var($variant['is_taxable'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if ($isTaxable) {
                    if (empty($variant['tax_code'])) {
                        $v->errors()->add("variants.{$index}.tax_code", 'El código de impuesto es requerido.');
                    }
                    if (!isset($variant['tax_rate']) || $variant['tax_rate'] === '') {
                        $v->errors()->add("variants.{$index}.tax_rate", 'La tasa de impuesto es requerida.');
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        // ... (tus mensajes se mantienen, añadimos uno)
        return [
            'variants.*.sku.distinct' => 'Hay SKUs repetidos en el formulario.',
            'variants.*.sku.unique' => 'El SKU ya existe en el sistema.',
            'variants.*.barcode.unique' => 'El código de barras ya está registrado.',
            'supplier_id.required' => 'El proveedor es obligatorio para productos inventariables.',
        ];
    }
}
