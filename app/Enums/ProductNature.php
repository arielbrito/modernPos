<?php

namespace App\Enums;

enum ProductNature: string
{
    case STOCKABLE = 'stockable';
    case SERVICE = 'service';

    public function label(): string
    {
        return match ($this) {
            self::STOCKABLE => 'Inventariable',
            self::SERVICE => 'Servicio',
        };
    }
}
