<?php

// app/Http/Requests/Cash/Register/UpdateRegisterRequest.php
namespace App\Http\Requests\Cash\Register;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('register')) ?? false;
    }

    public function rules(): array
    {
        return [
            'name'   => ['required', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
