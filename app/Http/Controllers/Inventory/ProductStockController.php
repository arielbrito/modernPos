<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\ProductStockMovement;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProductStockController extends Controller
{
    public function adjust(Request $request, ProductVariant $variant)
    {
        $data = $request->validate([
            'store_id'   => ['required', 'exists:stores,id'],
            'type'       => ['required', 'in:purchase_entry,sale_exit,adjustment_in,adjustment_out'],
            'quantity'   => ['required', 'numeric', 'min:0.01'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ]);

        // Ejemplo de autorización (ajústalo a tu política real):
        // $this->authorize('update', $variant->product);

        DB::transaction(function () use ($data, $variant) {
            $inventory = Inventory::firstOrCreate(
                ['store_id' => $data['store_id'], 'product_variant_id' => $variant->id],
                ['quantity' => 0]
            );

            $delta = in_array($data['type'], ['purchase_entry', 'adjustment_in'])
                ? $data['quantity']
                : -$data['quantity'];

            $inventory->increment('quantity', $delta);

            ProductStockMovement::create([
                'product_variant_id' => $variant->id,
                'store_id'           => $data['store_id'],
                'type'               => $data['type'],
                'quantity'           => $data['quantity'],
                'unit_price'         => $data['unit_price'] ?? 0,
                'subtotal'           => ($data['unit_price'] ?? 0) * $data['quantity'],
                'user_id'            => Auth::id(),
                'source_id'          => null,  // si permites manual
                'source_type'        => null,  // si permites manual
                'notes'              => $data['notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Ajuste de stock registrado correctamente.');
    }
}
