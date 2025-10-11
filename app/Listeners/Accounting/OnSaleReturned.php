<?php

namespace App\Listeners\Accounting;

use App\Events\Sales\SaleReturned;
use App\Models\SaleReturn;
use App\Services\Accounting\JournalService;

class OnSaleReturned
{
    public function __construct(protected JournalService $journal) {}

    public function handle(SaleReturned $e): void
    {
        $ret = SaleReturn::with('sale')->find($e->saleReturnId);
        if (!$ret) return;

        $map = config('accounting.map');
        $this->journal->createForSaleReturn($ret, $map);

        // Si no hubo cash_refund => crédito a favor (según política)
        if (config('accounting.returns.default_settlement') === 'customer_credit' && $ret->sale?->customer_id) {
            app(\App\Services\CustomerBalanceService::class)->credit(
                customerId: $ret->sale->customer_id,
                amount: (float) $ret->total_refund,
                reason: 'sale_return',
                source: $ret,
                meta: ['sale_id' => $ret->sale_id]
            );
        }
    }
}
