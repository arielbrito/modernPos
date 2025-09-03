<?php

namespace App\Http\Requests\Settings;

use App\Models\User as UserModel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var \App\Models\User $target */
        $target = $this->route('user'); // parámetro tipado en la ruta
        return $this->user()->can('update', $target);
    }

    protected function prepareForValidation(): void
    {
        $routeUser = $this->route('user'); // puede ser id o instancia
        $userId    = $routeUser instanceof UserModel ? $routeUser->getKey() : $routeUser;

        $storeIds = collect($this->input('store_ids', []))
            ->filter(fn($v) => $v !== null && $v !== '')
            ->map(fn($v) => (int) $v)
            ->unique()
            ->values()
            ->all();

        $this->merge([
            'user_route_id' => $userId,
            'name'          => $this->name ? trim($this->name) : null,
            'email'         => $this->email ? mb_strtolower(trim($this->email)) : null,
            'role_id'       => $this->role_id !== null && $this->role_id !== '' ? (int) $this->role_id : null,
            'store_ids'     => $storeIds,
        ]);

        if ($this->has('password') && $this->input('password') === '') {
            $this->merge(['password' => null, 'password_confirmation' => null]);
        }
    }

    public function rules(): array
    {
        $target = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($target->id),
            ],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'store_ids' => ['required', 'array', 'min:1'],
            'store_ids.*' => ['integer', 'exists:stores,id'],
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
