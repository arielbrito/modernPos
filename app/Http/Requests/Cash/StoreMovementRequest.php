<?php

namespace App\Http\Requests\Cash;

use Illuminate\Foundation\Http\FormRequest;

class StoreMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id'      => ['nullable', 'exists:cash_shifts,id,status,open'],
            'direction'     => ['required', 'in:in,out'],
            'currency_code' => ['required', 'string', 'size:3'],
            'amount'        => ['required', 'numeric', 'gt:0'],
            'reason'        => ['nullable', 'string', 'max:100'],
            'reference'     => ['nullable', 'string', 'max:100'],
            'notes'         => ['nullable', 'string', 'max:1000'],
        ];
    }
}
