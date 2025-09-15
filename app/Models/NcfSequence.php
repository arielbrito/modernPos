<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NcfSequence extends Model
{
    protected $fillable = [
        'store_id',
        'ncf_type_code',
        'prefix',
        'next_number',
        'end_number',
        'pad_length',
        'active'
    ];
    protected $casts = [
        'next_number' => 'int',
        'end_number' => 'int',
        'pad_length' => 'int',
        'active' => 'bool',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
    public function type()
    {
        return $this->belongsTo(NcfType::class, 'ncf_type_code', 'code');
    }

    //Formatea un número dado como NCF completo */
    public function format(int $number): string
    {
        $num = str_pad((string)$number, (int)$this->pad_length, '0', STR_PAD_LEFT);
        return ($this->prefix ?? $this->ncf_type_code) . $num;
    }
}
