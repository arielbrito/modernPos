<?php

// app/Http/Requests/CRM/StoreCustomerRequest.php
namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'               => ['required', 'string', 'max:255'],
            'kind'               => ['required', 'in:person,company'],
            'document_type'      => ['required', 'in:RNC,CED,NONE'],
            'document_number'    => ['nullable', 'string', 'max:32'],
            'email'              => ['nullable', 'email', 'max:255'],
            'phone'              => ['nullable', 'string', 'max:50'],
            'address'            => ['nullable', 'string', 'max:255'],
            'is_taxpayer'        => ['boolean'],
            'active'             => ['boolean'],
            'allow_credit'       => ['boolean'],
            'credit_limit'       => ['numeric', 'min:0'],
            'credit_terms_days'  => ['integer', 'min:0', 'max:365'],
        ];
    }

    public function prepareForValidation(): void
    {
        $docType = (string) $this->input('document_type', 'NONE');
        $docRaw  = (string) $this->input('document_number', '');
        $norm    = preg_replace('/\D+/', '', $docRaw) ?: null;

        $this->merge([
            'document_number_norm' => $norm,
        ]);
    }

    public function withValidator($validator)
    {
        $validator->after(function ($v) {
            $type = $this->input('document_type');
            $norm = $this->input('document_number_norm');

            if ($type === 'NONE' && $norm) {
                $v->errors()->add('document_number', 'No debe indicar documento si el tipo es NONE.');
            }

            if (in_array($type, ['RNC', 'CED'])) {
                if (!$norm) {
                    $v->errors()->add('document_number', 'Indique el número de documento.');
                } else {
                    if ($type === 'RNC' && strlen($norm) !== 9) {
                        $v->errors()->add('document_number', 'El RNC debe tener 9 dígitos.');
                    }
                    if ($type === 'CED' && strlen($norm) !== 11) {
                        $v->errors()->add('document_number', 'La cédula debe tener 11 dígitos.');
                    }
                }
            }
        });
    }
}
