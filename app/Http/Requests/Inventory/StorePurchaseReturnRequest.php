<?php

// app/Http/Requests/Purchasing/StorePurchaseReturnRequest.php
namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchase_id' => ['required', 'integer', 'exists:purchases,id'],
            'return_date' => ['required', 'date'],
            'notes'       => ['nullable', 'string', 'max:1000'],

            'items'                               => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id'            => ['required', 'integer', 'exists:purchase_items,id'],
            'items.*.product_variant_id'          => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity'                    => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Agrega al menos un ítem a devolver.',
        ];
    }
}
