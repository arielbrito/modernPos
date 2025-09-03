<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalización y saneamiento previo a validar
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name'      => $this->name ? trim($this->name) : null,
            'rnc'       => $this->rnc ? trim($this->rnc) : null,
            'phone'     => $this->phone ? trim($this->phone) : null,
            'address'   => $this->address ? trim($this->address) : null,
            'email'     => $this->email ? trim($this->email) : null,
            'currency'  => $this->currency ? mb_strtoupper(trim($this->currency)) : null,
            'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
        ]);
    }

    public function rules(): array
    {
        // Si tienes catálogo de monedas, centralízalo:
        // $currencies = array_column(\App\Constants\Currency::LIST, 'value');
        $currencies = ['DOP', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'BRL', 'GBP', 'CAD', 'CLP']; // ajusta a tu catálogo real

        return [
            'name'      => ['bail', 'required', 'string', 'max:255', 'unique:stores,name'],
            'rnc'       => ['nullable', 'string', 'max:11', 'unique:stores,rnc'],
            'phone'     => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s().]{6,20}$/'],
            'address'   => ['nullable', 'string', 'max:500'],
            'email'     => ['nullable', 'email:rfc,dns', 'max:255'],
            'currency'  => ['bail', 'required', 'string', 'size:3', Rule::in($currencies)],
            // Si quieres permitir SVG, quita 'image' y agrega 'mimes:svg' o 'mimetypes:image/svg+xml'
            'logo'      => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'], // 2MB
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'El nombre es obligatorio.',
            'name.unique'       => 'Ya existe una tienda con ese nombre.',
            'rnc.unique'        => 'Este RNC ya está registrado.',
            'phone.regex'       => 'El teléfono contiene caracteres no válidos.',
            'currency.required' => 'La moneda es obligatoria.',
            'currency.size'     => 'La moneda debe ser un código ISO de 3 letras.',
            'currency.in'       => 'La moneda seleccionada no es válida.',
            'logo.image'        => 'El logo debe ser una imagen.',
            'logo.mimes'        => 'Formatos permitidos: png, jpg, jpeg, webp.',
            'logo.max'          => 'El logo no debe superar los :max KB.',
            'is_active.boolean' => 'El campo activo debe ser verdadero o falso.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name'     => 'nombre',
            'rnc'      => 'RNC',
            'phone'    => 'teléfono',
            'address'  => 'dirección',
            'email'    => 'correo electrónico',
            'currency' => 'moneda',
            'logo'     => 'logo',
            'is_active' => 'activo',
        ];
    }
}
