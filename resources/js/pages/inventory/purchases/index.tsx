import * as React from "react";
import { Head, Link } from "@inertiajs/react";

// --- HOOKS ---
import { usePurchaseFilters } from "./hooks/usePurchaseFilters";
import { usePurchaseActions } from "./hooks/usePurchaseActions";

// --- LAYOUT, COMPONENTS & PARTIALS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { StatCard } from "./partials/StatCard";
import { SearchFilter } from "./partials/SearchFilter";
import { PurchaseRow } from "./partials/PurchaseRow";
import { MobilePurchaseCard } from "./partials/MobilePurchaseCard";
import { EmptyState } from "./partials/EmptyState";
import { Package, DollarSign, AlertTriangle } from "lucide-react";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, Paginated, Purchase } from "@/types";
import { money } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    // Mantengo tu nombre 'compras' para no romper nada,
    // pero normalizo números dentro del componente.
    compras: Paginated<
        Purchase & {
            returns_total: number | null;
            true_balance?: number; // puede no venir del backend aún
        }
    >;
    filters: { search?: string; status?: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Compras", href: PurchaseController.index.url() }];

export default function IndexPurchases({ compras, filters: initialFilters }: Props) {
    // 1) Hooks de filtros/acciones
    const { filters, handleFilterChange, clearFilters } = usePurchaseFilters(initialFilters);
    const actions = usePurchaseActions();

    // 2) Normalización de datos (evita NaN/undefined y soporta true_balance opcional)
    const normalized = React.useMemo(() => {
        return compras.data.map((p) => {
            const grand_total = Number((p as any).grand_total ?? 0);
            const balance_total = Number((p as any).balance_total ?? 0);
            const returns_total = Number((p as any).returns_total ?? 0);

            // Si viene true_balance del backend lo uso; si no, lo calculo.
            const true_balance =
                typeof (p as any).true_balance !== "undefined"
                    ? Number((p as any).true_balance)
                    : balance_total - returns_total;

            return {
                ...p,
                grand_total: isFinite(grand_total) ? grand_total : 0,
                balance_total: isFinite(balance_total) ? balance_total : 0,
                returns_total: isFinite(returns_total) ? returns_total : 0,
                true_balance: isFinite(true_balance) ? true_balance : 0,
            };
        });
    }, [compras.data]);

    // 3) KPIs seguros
    const stats = React.useMemo(() => {
        const totalBalance = normalized.reduce((sum, p) => sum + (p as any).true_balance, 0);
        const draftCount = normalized.filter((p) => p.status === "draft").length;
        const totalPurchasedInPeriod = normalized.reduce((sum, p) => sum + (p as any).grand_total, 0);
        return { totalBalance, draftCount, totalPurchasedInPeriod };
    }, [normalized]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compras" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* --- ENCABEZADO MEJORADO --- */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Package className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de Compras</h1>
                            <p className="text-sm text-muted-foreground">
                                {typeof compras.total === "number" && compras.total > 0
                                    ? `Mostrando ${compras.from}-${compras.to} de ${compras.total} registros`
                                    : "Sin resultados"}
                            </p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={PurchaseController.create.url()}>Nueva Compra</Link>
                    </Button>
                </div>

                {/* --- KPI CARDS --- */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Total Comprado (Período)"
                        value={money(stats.totalPurchasedInPeriod)}
                        icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Balance Pendiente Total"
                        value={money(stats.totalBalance)}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Compras en Borrador"
                        value={String(stats.draftCount)}
                        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>

                <Card>
                    <CardHeader>
                        {/* --- FILTROS --- */}
                        <SearchFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                        />
                    </CardHeader>

                    <CardContent className="p-0">
                        {normalized.length > 0 ? (
                            <>
                                {/* --- VISTA DE TABLA (desktop) --- */}
                                <div className="hidden lg:block">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Código</TableHead>
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Factura / Fecha</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Devolución</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <tbody>
                                            {normalized.map((p) => (
                                                <PurchaseRow key={p.id} purchase={p as any} actions={actions} />
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>

                                {/* --- VISTA MÓVIL --- */}
                                <div className="lg:hidden p-4 space-y-4">
                                    {normalized.map((p) => (
                                        <MobilePurchaseCard key={p.id} purchase={p as any} actions={actions} />
                                    ))}
                                </div>

                                <div className="p-4 border-t">
                                    <Pagination links={compras.links} />
                                </div>
                            </>
                        ) : (
                            <EmptyState />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
