<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('customer')?->id ?? null;

        return [
            'name'           => ['required', 'string', 'max:255'],
            'kind'           => ['required', 'in:person,company'],
            'document_type'  => ['required', 'in:RNC,CED,NONE'],
            'document_number' => ['nullable', 'string', 'max:32'],
            'email'          => ['nullable', 'email', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:50'],
            'address'        => ['nullable', 'string', 'max:500'],
            'is_taxpayer'    => ['boolean'],
            'active'         => ['boolean'],
            'allow_credit'   => ['boolean'],
            'credit_limit'   => ['numeric', 'gte:0'],
            'credit_terms_days' => ['integer', 'gte:0'],

            'document_number_norm' => [
                'nullable',
                Rule::unique('customers', 'document_number_norm')
                    ->where(fn($q) => $q->where('document_type', $this->input('document_type')))
                    ->ignore($id),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $docType = $this->input('document_type');
        $docNum  = $this->input('document_number');

        $norm = null;
        if (in_array($docType, ['RNC', 'CED']) && $docNum) {
            $norm = preg_replace('/\D+/', '', $docNum);
        }

        $this->merge(['document_number_norm' => $norm]);
    }
}
