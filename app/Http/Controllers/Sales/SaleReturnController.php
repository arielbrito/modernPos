<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Services\SaleReturnService;

class SaleReturnController extends Controller
{
    public function store(StoreSaleReturnRequest $req, SaleReturnService $svc)
    {
        $sale = Sale::findOrFail((int)$req->input('sale_id'));
        $this->authorize('refund', $sale);

        try {
            $ret = $svc->create($req->validated(), $req->user()->id);
            return response()->json(['ok' => true, 'return_id' => $ret->id, 'total_refund' => $ret->total_refund], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
