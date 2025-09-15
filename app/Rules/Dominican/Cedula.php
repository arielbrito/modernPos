<?php

namespace App\Rules\Dominican;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Cedula implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $v = preg_replace('/\D/', '', (string)$value);
        if (strlen($v) !== 11) {
            $fail('Cédula inválida.');
            return;
        }
    }
}
