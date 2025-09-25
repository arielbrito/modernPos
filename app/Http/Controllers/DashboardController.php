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
                COALESCE(SUM(grand_total), 0) as total_revenue,
                COALESCE(AVG(grand_total), 0) as average_ticket
            ")->first();

        // --- COMPRAS ---
        $purchasesStats = Purchase::where('store_id', $storeId)
            ->selectRaw("
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                COALESCE(SUM(CASE WHEN status IN ('partially_received', 'received') THEN balance_total ELSE 0 END), 0) as total_balance_due
            ")->first();

        // --- INVENTARIO ---
        $lowStockVariants = ProductVariant::with('product')
            ->whereHas('inventory', function ($query) use ($storeId) {
                $query->where('store_id', $storeId)
                    ->whereColumn('quantity', '<=', 'stock_alert_threshold');
            })
            ->limit(5)
            ->get();

        // --- GRÁFICO DE VENTAS (ÚLTIMOS 7 DÍAS) ---
        $salesChartData = Sale::where('store_id', $storeId)
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get([
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(grand_total) as total')
            ]);

        return Inertia::render('Dashboard/Index', [
            'stats' => [
                'sales_today_revenue' => (float) $salesToday->total_revenue,
                'sales_today_count' => (int) $salesToday->count,
                'sales_today_average_ticket' => (float) $salesToday->average_ticket,
                'purchases_draft_count' => (int) $purchasesStats->draft_count,
                'purchases_total_due' => (float) $purchasesStats->total_balance_due,
                'low_stock_items_count' => $lowStockVariants->count(), // O un count() más performante si son muchos
            ],
            'lowStockVariants' => $lowStockVariants,
            'salesChartData' => $salesChartData,
        ]);
    }
}
