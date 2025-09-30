<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Casts\Attribute;

class ReceiptSetting extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'receipt_settings';

    /**
     * The attributes that are mass assignable.
     * Estos son los campos que permitimos que se guarden masivamente
     * desde el controlador. Deben coincidir con tu migración.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_name',
        'tax_id',
        'address',
        'phone',
        'email',
        'website',
        'logo_path',
        'footer_message',
        'terms_and_conditions',
    ];

    /**
     * The accessors to append to the model's array form.
     * 'logo_url' será un campo calculado que se añadirá automáticamente
     * cuando el modelo se convierta a JSON, muy útil para el frontend.
     *
     * @var array
     */
    protected $appends = ['logo_url'];

    /**
     * Accessor para obtener la URL completa del logo.
     *
     * Este método mágico crea un atributo virtual `logo_url`.
     * Cuando el frontend pida `settings.logo_url`, Laravel ejecutará este
     * código para generar la URL completa y segura del logo guardado.
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->logo_path
                ? Storage::disk('public')->url($this->logo_path)
                : null,
        );
    }
}
