<?php

namespace App\Http\Requests\Sales;


use App\Enums\PaymentMethod as AppPaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'store_id'              => ['required', 'integer', 'exists:stores,id'],
            'register_id'           => ['nullable', 'integer', 'exists:registers,id'],
            'customer_id'           => ['nullable', 'integer', 'exists:customers,id'],
            'bill_to_name' => ['required', 'string', 'max:160'],
            'bill_to_doc_type' => ['required', 'in:RNC,CED,NONE'],
            'bill_to_doc_number' => ['nullable', 'string', 'max:20'],
            'bill_to_is_taxpayer' => ['nullable', 'boolean'],
            'currency_code'         => ['required', 'string', 'exists:currencies,code'],
            'fx_rate_to_store'      => ['nullable', 'numeric', 'min:0'],
            'occurred_at'           => ['nullable', 'date'],
            'meta'                  => ['nullable', 'array'],

            // CORREGIDO: shift_id validado como 'integer'
            'shift_id' => [
                Rule::requiredIf(fn() => collect($this->input('payments'))->contains('method', 'cash')),
                'integer', // <- CORRECCIÓN APLICADA
                'exists:cash_shifts,id'
            ],

            'lines'                 => ['required', 'array', 'min:1'],
            'lines.*.variant_id'    => ['required', 'integer', 'exists:product_variants,id'],
            'lines.*.qty'           => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price'    => ['required', 'numeric', 'gte:0'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'lines.*.discount_amount'  => ['nullable', 'numeric', 'gte:0'],
            'lines.*.tax_code'      => ['nullable', 'string', 'max:20'],
            'lines.*.tax_name'      => ['nullable', 'string', 'max:100'],
            'lines.*.tax_rate'      => ['nullable', 'required_with:lines.*.tax_code', 'numeric', 'gte:0'],

            'payments'              => ['required', 'array', 'min:1'],
            'payments.*.method'     => ['required', Rule::enum(AppPaymentMethod::class)],
            'payments.*.amount'     => ['required', 'numeric', 'gte:0'],
            'payments.*.currency_code' => ['required', 'string', 'exists:currencies,code'],
            'payments.*.fx_rate_to_sale' => ['nullable', 'numeric', 'gt:0'],
            'payments.*.tendered_amount' => ['nullable', 'required_if:payments.*.method,cash', 'numeric', 'gte:0'],
            'payments.*.change_amount'   => ['nullable', 'numeric', 'gte:0'],
            'payments.*.bank_name' => ['nullable', 'string', 'max:100'],
            'payments.*.card_brand' => ['nullable', 'string', 'max:50'],
            'payments.*.card_last4' => ['nullable', 'string', 'digits:4'],
            'payments.*.change_currency_code' => ['nullable', 'string', 'size:3'],
            'payments.*.reference'  => ['nullable', 'string', 'max:120'],
            'payments.*.meta'       => ['nullable', 'array'],
        ];


        $this->after(function ($validator) {
            $type = $this->input('bill_to_doc_type');
            $num  = $this->input('bill_to_doc_number');
            $taxp = (bool)$this->input('bill_to_is_taxpayer');

            if ($type === 'NONE') {
                if (!empty($num) || $taxp) {
                    $validator->errors()->add('bill_to_doc_type', 'Si es NONE no debe tener documento ni contribuyente.');
                }
            }
            if ($taxp && $type !== 'RNC') {
                $validator->errors()->add('bill_to_is_taxpayer', 'Sólo RNC puede marcarse como contribuyente.');
            }
        });
    }
}
