<?php

namespace App\Http\Requests\Inventory\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        // La autorización se maneja en la ruta con el middleware 'can',
        // pero podemos dejarlo en true aquí.
        return true;
    }

    public function rules(): array
    {
        $purchase = $this->route('purchase');

        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'invoice_number' => ['nullable', 'string', 'max:255', Rule::unique('purchases')->ignore($purchase->id)],
            'invoice_date'   => ['required', 'date'],
            'currency'       => ['required', 'string', 'size:3'],
            'exchange_rate'  => ['required', 'numeric', 'min:0.000001'],
            'freight'        => ['nullable', 'numeric', 'min:0'],
            'other_costs'    => ['nullable', 'numeric', 'min:0'],
            'notes'          => ['nullable', 'string'],

            'items'                          => ['required', 'array', 'min:1'],
            'items.*.id'                     => ['nullable', 'integer', 'exists:purchase_items,id'], // ID para items existentes
            'items.*.product_variant_id'     => ['required', 'exists:product_variants,id'],
            'items.*.qty_ordered'            => ['required', 'numeric', 'gt:0'],
            'items.*.unit_cost'              => ['required', 'numeric', 'gte:0'],
            'items.*.discount_pct'           => ['nullable', 'numeric', 'between:0,100'],
            'items.*.tax_pct'                => ['nullable', 'numeric', 'gte:0'],
        ];
    }
}
