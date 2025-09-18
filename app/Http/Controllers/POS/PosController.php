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
        // 1. OBTENER LA TIENDA ACTIVA: El stock depende de la tienda.
        $storeId = (int) session('active_store_id');

        // Si no hay tienda activa, no podemos calcular el stock.
        if (!$storeId) {
            // Devolvemos un array vacío para no romper el frontend.
            return response()->json([]);
        }

        $term = $request->query('term', '');
        $limit = (int) $request->query('limit', 12); // Aumenté un poco el límite para llenar mejor la cuadrícula.

        $q = Product::query()
            // 2. AÑADIR `product_nature`: Esencial para distinguir servicios.
            ->select('id', 'name', 'product_nature')
            ->with(['variants' => function ($v) use ($storeId) {
                $v->select(
                    'id',
                    'product_id',
                    'sku',
                    'barcode',
                    'selling_price',
                    'image_path',
                    'is_taxable',
                    'tax_code',
                    'tax_rate'
                )
                    // 3. AÑADIR CÁLCULO DE STOCK: La parte más importante.
                    // Esto añade la propiedad `stock` a cada variante de forma ultra eficiente.
                    ->withSum([
                        'inventory as stock' => function ($iq) use ($storeId) {
                            $iq->where('store_id', $storeId);
                        }
                    ], 'quantity');
            }]);

        if ($term !== '' && mb_strlen($term) >= 2) {
            $q->where(function ($qq) use ($term) {
                $qq->where('name', 'ILIKE', "%{$term}%")
                    ->orWhereHas(
                        'variants',
                        fn($vq) =>
                        $vq->where('sku', 'ILIKE', "%{$term}%")
                            ->orWhere('barcode', 'ILIKE', "%{$term}%")
                    );
            });
        } else {
            $q->latest('id');
        }

        return response()->json($q->limit($limit)->get());
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
