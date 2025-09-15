<?php

// app/Http/Requests/Cash/Register/StoreRegisterRequest.php
namespace App\Http\Requests\Cash\Register;

use Illuminate\Foundation\Http\FormRequest;

class StoreRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Register::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            // store_id lo tomamos de la sesión para evitar “cajas en otra tienda”
        ];
    }
}
