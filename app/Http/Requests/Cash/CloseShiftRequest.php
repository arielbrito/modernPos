<?php
// app/Http/Requests/Cash/CloseShiftRequest.php
namespace App\Http\Requests\Cash;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'note' => ['nullable', 'string', 'max:500'],
            'closing' => ['required', 'array'],
            'closing.*' => ['array'], // claves arbitrarias (DOP, USD, ...)
            'closing.*.*.denomination_id' => ['required', 'integer', 'exists:cash_denominations,id'],
            'closing.*.*.qty' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator($v)
    {
        $v->after(function ($val) {
            if (!$this->input('closing') && !$this->input('closing_count')) {
                $val->errors()->add('closing', 'Debe enviar closing (por moneda) o closing_count.');
            }
        });
    }
}
