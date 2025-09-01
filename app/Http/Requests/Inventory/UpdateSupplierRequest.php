<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('supplier')?->id ?? null; // model binding
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('suppliers', 'name')->ignore($id)],
            'rnc' => ['nullable', 'string', 'max:50', Rule::unique('suppliers', 'rnc')->ignore($id)],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('suppliers', 'email')->ignore($id)],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean',],
        ];
    }
}
