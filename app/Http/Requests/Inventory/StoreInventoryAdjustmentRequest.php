<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Reemplazar con tu lógica de Policy si es necesario
    }

    public function rules(): array
    {
        return [

            'reason'          => ['required', 'string', 'max:255'],
            'adjustment_date' => ['required', 'date'],
            'notes'           => ['nullable', 'string'],

            'items'                               => ['required', 'array', 'min:1'],
            'items.*.product_variant_id'          => ['required', 'exists:product_variants,id'],
            'items.*.sku'                         => ['required', 'string'], // Para mensajes de error
            'items.*.new_quantity'                => ['required', 'numeric', 'min:0'],
        ];
    }
}
