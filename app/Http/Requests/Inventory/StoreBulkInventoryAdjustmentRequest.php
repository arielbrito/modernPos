<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreBulkInventoryAdjustmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Aquí puedes añadir tu lógica de Policy si lo necesitas
        // Por ejemplo: return $this->user()->can('create', InventoryAdjustment::class);
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
            'reason'          => ['required', 'string', 'max:255'],
            'adjustment_date' => ['required', 'date'],
            'notes'           => ['nullable', 'string'],

            'items'                               => ['required', 'array', 'min:1'],
            'items.*.product_variant_id'          => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.new_quantity'                => ['required', 'numeric', 'min:0'],

            // Campos no necesarios para la lógica, pero buenos para la validación
            'items.*.previous_quantity'           => ['required', 'numeric'],
            'items.*.sku'                         => ['required', 'string'],
        ];
    }
}
