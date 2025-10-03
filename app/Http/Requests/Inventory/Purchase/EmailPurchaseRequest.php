<?php

// app/Http/Requests/Inventory/Purchase/EmailPurchaseRequest.php
namespace App\Http\Requests\Inventory\Purchase;

use Illuminate\Foundation\Http\FormRequest;

class EmailPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to'       => ['required', 'email'],
            'cc'       => ['nullable', 'email'],
            'subject'  => ['required', 'string', 'max:180'],
            'message'  => ['nullable', 'string', 'max:2000'],
            'attach_pdf' => ['boolean'],
        ];
    }
}
