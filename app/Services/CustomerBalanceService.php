<?php

namespace App\Services;

use App\Models\{Customer, CustomerBalance, CustomerBalanceEntry};
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CustomerBalanceService
{
    public function credit(int $customerId, float $amount, string $reason, $source, array $meta = []): void
    {
        if ($amount <= 0) throw new InvalidArgumentException('Monto inválido para crédito.');
        DB::transaction(function () use ($customerId, $amount, $reason, $source, $meta) {
            /** @var CustomerBalance $bal */
            $bal = CustomerBalance::firstOrCreate(['customer_id' => $customerId], ['balance' => 0]);
            $bal->increment('balance', $amount);
            $bal->entries()->create([
                'entry_date' => now()->toDateString(),
                'direction'  => 'credit',
                'amount'     => $amount,
                'reason'     => $reason,
                'source_type' => get_class($source),
                'source_id'  => $source->getKey(),
                'meta'       => $meta,
            ]);
        });
    }

    public function debit(int $customerId, float $amount, string $reason, $source, array $meta = []): void
    {
        if ($amount <= 0) throw new InvalidArgumentException('Monto inválido para débito.');
        DB::transaction(function () use ($customerId, $amount, $reason, $source, $meta) {
            $bal = CustomerBalance::where('customer_id', $customerId)->lockForUpdate()->first();
            if (!$bal || $bal->balance < $amount) throw new InvalidArgumentException('Crédito insuficiente.');
            $bal->decrement('balance', $amount);
            $bal->entries()->create([
                'entry_date' => now()->toDateString(),
                'direction'  => 'debit',
                'amount'     => $amount,
                'reason'     => $reason,
                'source_type' => get_class($source),
                'source_id'  => $source->getKey(),
                'meta'       => $meta,
            ]);
        });
    }
}
