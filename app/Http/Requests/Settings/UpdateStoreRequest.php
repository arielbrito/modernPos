<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Store;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name'      => $this->name ? trim($this->name) : null,
            'rnc'       => $this->rnc ? trim($this->rnc) : null,
            'phone'     => $this->phone ? trim($this->phone) : null,
            'address'   => $this->address ? trim($this->address) : null,
            'email'     => $this->email ? trim($this->email) : null,
            'currency'  => $this->currency ? mb_strtoupper(trim($this->currency)) : null,
            'is_active' => $this->boolean('is_active'), // 👈 más seguro que filter_var
        ]);
    }

    public function rules(): array
    {
        $routeStore = $this->route('store');
        $storeId = $routeStore instanceof Store ? $routeStore->getKey() : $routeStore;

        $currencies = ['DOP', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'BRL', 'GBP', 'CAD', 'CLP'];

        return [
            'name'      => ['bail', 'required', 'string', 'max:255', Rule::unique('stores', 'name')->ignore($storeId)],
            'rnc'       => ['nullable', 'string', 'max:11', Rule::unique('stores', 'rnc')->ignore($storeId)],
            'phone'     => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s().]{6,20}$/'],
            'address'   => ['nullable', 'string', 'max:500'],
            'email'     => ['nullable', 'email:rfc,dns', 'max:255'],
            'currency'  => ['bail', 'required', 'string', 'size:3', Rule::in($currencies)],
            // Suma 'image' si quieres verificación de imagen además de las extensiones
            'logo'      => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
