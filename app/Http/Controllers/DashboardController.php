<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $storeId = session('active_store_id');
        $today = now()->today();

        // --- VENTAS ---
        $salesToday = Sale::where('store_id', $storeId)
            ->whereDate('created_at', $today)
            ->selectRaw("
                COUNT(*) as count,
                COALESCE(SUM(paid_total), 0) as total_revenue,
                COALESCE(AVG(paid_total), 0) as average_ticket
            ")->first();

        // --- COMPRAS (CORRECCIÓN AQUÍ) ---
        $purchasesStats = Purchase::query()
            // Especificamos la tabla para el 'store_id'
            ->where('purchases.store_id', $storeId)
            ->leftJoin('purchase_returns', 'purchases.id', '=', 'purchase_returns.purchase_id')
            ->selectRaw("
                COUNT(DISTINCT CASE WHEN purchases.status = 'draft' THEN purchases.id END) as draft_count,
                COALESCE(SUM(
                    CASE 
                        WHEN purchases.status IN ('partially_received', 'received') 
                        THEN purchases.grand_total - purchases.paid_total - COALESCE(purchase_returns.total_value, 0) 
                        ELSE 0 
                    END
                ), 0) as total_balance_due
            ")->first();


        // --- INVENTARIO ---
        $lowStockVariants = ProductVariant::with('product')
            ->where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('product_nature', 'stockable'))
            // Condición A: El producto TIENE inventario, pero la cantidad es baja.
            ->where(function ($query) use ($storeId) {
                $query->whereHas('inventory', function ($subQuery) use ($storeId) {
                    $subQuery->where('store_id', $storeId)
                        ->whereColumn('quantity', '<=', 'stock_alert_threshold');
                })
                    // Condición B: O el producto simplemente NO TIENE NINGÚN registro de inventario en esa tienda.
                    ->orWhereDoesntHave('inventory', function ($subQuery) use ($storeId) {
                        $subQuery->where('store_id', $storeId);
                    });
            })
            // También cargamos la relación para poder mostrar la cantidad (que será 0 o null para los nuevos)
            ->with(['inventory' => fn($q) => $q->where('store_id', $storeId)])
            ->limit(5)
            ->get();

        // --- GRÁFICO DE VENTAS ---
        $salesChartData = Sale::where('store_id', $storeId)
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get([
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(paid_total) as total')
            ]);

        return Inertia::render('dashboard', [
            'stats' => [
                'sales_today_revenue' => (float) $salesToday->total_revenue,
                'sales_today_count' => (int) $salesToday->count,
                'sales_today_average_ticket' => (float) $salesToday->average_ticket,
                'purchases_draft_count' => (int) $purchasesStats->draft_count,
                'purchases_total_due' => (float) $purchasesStats->total_balance_due,
                'low_stock_items_count' => $lowStockVariants->count(),
            ],
            'lowStockVariants' => $lowStockVariants,
            'salesChartData' => $salesChartData,
        ]);
    }
}
