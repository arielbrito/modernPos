<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PosController extends Controller
{
    public function index()
    {
        // Más adelante pasaremos aquí los productos y otros datos
        return Inertia::render('pos/index');
    }


    public function searchProducts(Request $request)
    {
        $term = $request->query('term', '');

        if (strlen($term) < 2) {
            return response()->json([]);
        }

        $products = Product::with('variants') // Cargar las variantes para tener precio y SKU
            ->where(function ($query) use ($term) {
                $query->where('name', 'ILIKE', "%{$term}%") // ILIKE es para búsqueda no sensible a mayúsculas en PostgreSQL
                    ->orWhereHas('variants', function ($subQuery) use ($term) {
                        $subQuery->where('sku', 'ILIKE', "%{$term}%")
                            ->orWhere('barcode', 'ILIKE', "%{$term}%");
                    });
            })
            ->take(10) // Limitar los resultados a 10 para no saturar
            ->get();

        return response()->json($products);
    }

    public function storeSale(Request $request)
    {
        $validated = $request->validate([
            'cart_items' => ['required', 'array', 'min:1'],
            'cart_items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'cart_items.*.quantity' => ['required', 'integer', 'min:1'],
            'cart_items.*.price' => ['required', 'numeric'],
            'payment_method' => ['required', 'string'],
            'total' => ['required', 'numeric'],
        ]);

        try {
            DB::transaction(function () use ($validated, $request) {
                // Asumimos que el usuario que vende es el autenticado y la tienda es la 1 (ajustar luego)
                $storeId = 1;

                // 1. Crear el registro de la venta
                $sale = Sale::create([
                    'user_id' => Auth::id(),
                    'store_id' => $storeId,
                    'final_amount' => $validated['total'],
                    'payment_method' => $validated['payment_method'],
                    // Llenar otros campos como subtotal, impuestos, etc.
                    'total_amount' => $validated['total'],
                ]);

                // 2. Crear los items de la venta y descontar stock
                foreach ($validated['cart_items'] as $item) {
                    $sale->items()->create([
                        'product_variant_id' => $item['product_variant_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['price'],
                        'total_price' => $item['quantity'] * $item['price'],
                    ]);

                    // 3. ¡Descontar el inventario!
                    Inventory::where('store_id', $storeId)
                        ->where('product_variant_id', $item['product_variant_id'])
                        ->decrement('quantity', $item['quantity']);
                }
            });
        } catch (\Exception $e) {
            // Si algo falla, devuelve un error
            return redirect()->back()->with('error', 'Error al procesar la venta: ' . $e->getMessage());
        }

        // Si todo va bien, devuelve éxito
        return redirect()->route('pos.index')->with('success', '¡Venta realizada exitosamente!');
    }
}
