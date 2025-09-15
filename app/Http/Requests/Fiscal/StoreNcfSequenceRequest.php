<?php

// app/Http/Requests/Fiscal/StoreNcfSequenceRequest.php
namespace App\Http\Requests\Fiscal;

use Illuminate\Foundation\Http\FormRequest;

class StoreNcfSequenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('ncf.manage');
    }
    public function rules(): array
    {
        return [
            'store_id'      => ['required', 'exists:stores,id'],
            'ncf_type_code' => ['required', 'exists:ncf_types,code'],
            'prefix'        => ['nullable', 'string', 'max:20'],
            'next_number'   => ['required', 'integer', 'min:1'],
            'end_number'    => ['nullable', 'integer', 'gte:next_number'],
            'pad_length'    => ['required', 'integer', 'between:6,12'],
            'active'        => ['boolean'],
        ];
    }
}
