<?php

namespace App\Http\Requests\Customers;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Deberías autorizar si el usuario puede registrar pagos.
        // Por ahora, lo dejamos abierto.
        return true;
    }

    public function rules(): array
    {
        $customer = $this->route('customer');

        return [
            'amount'          => ['required', 'numeric', 'gt:0', 'lte:' . $customer->balance],
            'payment_date'    => ['required', 'date'],
            'method'          => ['required', 'string', 'in:cash,card,transfer,other'],
            'notes'           => ['nullable', 'string'],
            'register_id'     => ['required_if:method,cash', 'integer', 'exists:registers,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.lte' => 'El monto del pago no puede ser mayor que el balance pendiente del cliente.',
            'register_id.required_if' => 'Se requiere una caja para registrar un pago en efectivo.'
        ];
    }
}
