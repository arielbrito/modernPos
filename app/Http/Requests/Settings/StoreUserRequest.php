<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // return $this->user()->can('create', User::class);
        return true;
    }

    protected function prepareForValidation(): void
    {
        $storeIds = collect($this->input('store_ids', []))
            ->filter(fn($v) => $v !== null && $v !== '')
            ->map(fn($v) => (int) $v)
            ->unique()
            ->values()
            ->all();

        $this->merge([
            'name'      => $this->name ? trim($this->name) : null,
            'email'     => $this->email ? mb_strtolower(trim($this->email)) : null,
            'role_id'   => $this->role_id !== null && $this->role_id !== '' ? (int) $this->role_id : null,
            'store_ids' => $storeIds,
        ]);
    }

    public function rules(): array
    {
        $guard = config('auth.defaults.guard', 'web');

        return [
            'name'     => ['bail', 'required', 'string', 'max:255'],
            'email'    => ['bail', 'required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['bail', 'required', 'confirmed', Password::defaults()],
            'role_id'  => [
                'bail',
                'required',
                'integer',
                Rule::exists('roles', 'id')->where('guard_name', $guard)
            ],
            'store_ids'   => ['bail', 'required', 'array', 'min:1'],
            'store_ids.*' => ['integer', 'distinct', 'exists:stores,id'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name'              => 'nombre',
            'email'             => 'correo electrónico',
            'password'          => 'contraseña',
            'password_confirmation' => 'confirmación de contraseña',
            'role_id'           => 'rol',
            'store_ids'         => 'tiendas',
            'store_ids.*'       => 'tienda',
        ];
    }
}
