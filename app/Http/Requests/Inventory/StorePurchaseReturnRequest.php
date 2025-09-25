<?php

namespace App\Http\Requests\Inventory;

use App\Models\PurchaseItem;
use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Aquí podrías usar una Policy para verificar si el usuario puede crear una devolución
        return true;
    }

    public function rules(): array
    {
        $purchase = $this->route('purchase');

        return [
            'return_date' => ['required', 'date'],
            'notes'       => ['nullable', 'string'],
            'items'       => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => [
                'required',
                'integer',
                // Asegura que el item que se devuelve realmente pertenece a la compra original
                'exists:purchase_items,id,purchase_id,' . $purchase->id,
            ],
            'items.*.quantity' => [
                'required',
                'numeric',
                'gt:0',
                // Validación personalizada para no devolver más de lo que se recibió
                function ($attribute, $value, $fail) {
                    $index = explode('.', $attribute)[1];
                    $itemId = $this->input("items.{$index}.purchase_item_id");
                    if (!$itemId) return;

                    $purchaseItem = PurchaseItem::find($itemId);
                    if ($purchaseItem && $value > $purchaseItem->qty_received) {
                        $fail("La cantidad a devolver no puede ser mayor que la cantidad recibida ({$purchaseItem->qty_received}).");
                    }
                },
            ],
        ];
    }
}
