<?php

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sale_id'     => ['required', 'exists:sales,id'],
            'reason'      => ['nullable', 'string'],
            'lines'       => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'exists:sale_lines,id'],
            'lines.*.qty'          => ['required', 'numeric', 'gt:0'],
            'lines.*.reason'       => ['nullable', 'string'],
            'cash_refund'          => ['nullable', 'array'],
            'cash_refund.currency_code' => ['required_with:cash_refund', 'string', 'size:3'],
            'cash_refund.amount'        => ['required_with:cash_refund', 'numeric', 'gt:0'],
            'cash_refund.reference'     => ['nullable', 'string', 'max:100'],
        ];
    }
}
