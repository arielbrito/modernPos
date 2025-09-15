<?php

// app/Http/Requests/Inventory/Purchase/ReceivePurchaseRequest.php
namespace App\Http\Requests\Inventory\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReceivePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'item_ids' => array_map('intval', array_keys($this->input('items', []))),
        ]);
    }

    public function rules(): array
    {
        $purchase = $this->route('purchase');
        $purchaseId = is_object($purchase) ? $purchase->id : (int)$purchase;

        return [
            'items'       => ['required', 'array', 'min:1'],
            'items.*'     => ['numeric', 'gte:0'],

            // Garantiza que todos los IDs pertenecen a esta compra
            'item_ids'    => ['required', 'array', 'min:1'],
            'item_ids.*'  => [
                'integer',
                Rule::exists('purchase_items', 'id')->where('purchase_id', $purchaseId),
            ],
        ];
    }
}
