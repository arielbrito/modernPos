<?php

// app/Http/Requests/Cash/OpenShiftRequest.php
namespace App\Http\Requests\Cash;

use Illuminate\Foundation\Http\FormRequest;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }
    public function rules(): array
    {
        return [
            'register_id' => ['required', 'exists:registers,id'],
            'opening'     => ['required', 'array', 'min:1'], // por moneda
            'opening.*'   => ['array'],
            'opening.*.*.denomination_id' => ['required', 'exists:cash_denominations,id'],
            'opening.*.*.qty'             => ['required', 'integer', 'min:0'],
            'note'        => ['nullable', 'string'],
        ];
    }
}
