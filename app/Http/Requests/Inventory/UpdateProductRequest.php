<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule; // <-- Importamos Rule
use Illuminate\Validation\Validator;
use App\Models\ProductVariant;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:products,slug,' . $this->route('product')->id],
            'description' => ['nullable', 'string'],

            // --- REGLA AÑADIDA ---
            'product_nature' => ['required', Rule::in(['stockable', 'service'])],

            'category_id' => ['nullable', 'exists:categories,id'],

            // --- REGLA MEJORADA ---
            'supplier_id' => ['nullable', 'exists:suppliers,id', Rule::requiredIf($this->input('product_nature') === 'stockable')],

            'type' => ['required', 'in:simple,variable'],
            'unit' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
            'image' => ['nullable', 'image', 'max:2048'],

            // Las reglas de variantes se mantienen, la lógica compleja está en withValidator.
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.sku' => ['required', 'string', 'max:100'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.attributes' => ['nullable'],
            'variants.*.is_taxable' => ['sometimes', 'boolean'],
            'variants.*.tax_code' => ['nullable', 'string', 'max:32'],
            'variants.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $variants = collect($this->input('variants', []));

            // 1) Duplicados en el payload (mismo SKU en dos filas)
            $skus = $variants->pluck('sku')->filter()->map(fn($s) => mb_strtoupper($s));
            if ($skus->count() !== $skus->unique()->count()) {
                $v->errors()->add('variants', 'Hay SKUs duplicados dentro del formulario.');
            }

            // 2) Unicidad global ignorando el propio id
            foreach ($variants as $i => $row) {
                $sku = $row['sku'] ?? null;
                if (!$sku) continue;

                $variantId = $row['id'] ?? null;

                $exists = ProductVariant::where('sku', $sku)
                    ->when($variantId, fn($q) => $q->where('id', '!=', $variantId))
                    ->exists();

                if ($exists) {
                    $v->errors()->add("variants.$i.sku", "El SKU «{$sku}» ya está en uso.");
                }

                // Opcional: unicidad de barcode similar
                if (!empty($row['barcode'])) {
                    $barcodeExists = ProductVariant::where('barcode', $row['barcode'])
                        ->when($variantId, fn($q) => $q->where('id', '!=', $variantId))
                        ->exists();

                    if ($barcodeExists) {
                        $v->errors()->add("variants.$i.barcode", "El código de barras ya está en uso.");
                    }
                }

                $isTaxable = filter_var($row['is_taxable'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if ($isTaxable) {
                    if (empty($row['tax_code'])) {
                        $v->errors()->add("variants.{$i}.tax_code", 'El código de impuesto es requerido.');
                    }
                    if (!isset($row['tax_rate']) || $row['tax_rate'] === '') {
                        $v->errors()->add("variants.{$i}.tax_rate", 'La tasa de impuesto es requerida.');
                    }
                }
            }
        });
    }
}
