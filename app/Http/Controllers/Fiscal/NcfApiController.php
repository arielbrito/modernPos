<?php

// app/Http/Controllers/Fiscal/NcfApiController.php
namespace App\Http\Controllers\Fiscal;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\NcfService;
use Illuminate\Http\Request;

class NcfApiController extends Controller
{
    public function preview(Request $r, NcfService $svc)
    {
        $this->authorize('peek', \App\Models\User::class);

        $storeId    = (int) ($r->query('store_id') ?? session('active_store_id'));
        if (!$storeId) {
            return response()->json(['message' => 'No hay tienda activa.'], 422);
        }

        // Si mandan customer_id, usamos el tipo por defecto; si no, aceptamos ?type=...
        $customerId = (int) $r->query('customer_id');
        $customer   = $customerId ? Customer::find($customerId) : null;
        $type       = (string) ($r->query('type') ?? $svc->defaultTypeForCustomer($customer));

        $ncf = $svc->preview($storeId, $type);

        // Cuando no hay secuencia activa o está agotada
        if (!$ncf) {
            return response()->json(['type' => $type, 'ncf' => null], 200);
        }

        return response()->json(['type' => $type, 'ncf' => $ncf], 200);
    }

    public function defaultType(Request $r, NcfService $svc)
    {
        $customerId = (int) $r->query('customer_id');
        $customer   = $customerId ? Customer::find($customerId) : null;
        return response()->json(['type' => $svc->defaultTypeForCustomer($customer)]);
    }

    public function consume(Request $r, NcfService $svc)
    {
        $this->authorize('consume', \App\Models\User::class);

        $validated = $r->validate([
            'store_id' => ['required', 'exists:stores,id'],
            'type'     => ['required', 'exists:ncf_types,code'],
        ]);

        $ncf = $svc->consume($validated['store_id'], $validated['type']);
        return response()->json(['ncf' => $ncf]);
    }
}
