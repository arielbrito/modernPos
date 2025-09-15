<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CASH = 'cash';
    case CARD = 'card';
    case TRANSFER = 'transfer';
    case WALLET = 'wallet';
    case CREDIT = 'credit';
    case COUPON = 'coupon';
    case OTHER = 'other';
}
