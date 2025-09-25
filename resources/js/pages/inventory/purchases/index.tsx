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
    compras: Paginated<Purchase & { returns_total: number | null, true_balance: number }>;
    filters: { search: string; status: string; };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Compras", href: PurchaseController.index.url() }];

export default function IndexPurchases({ compras, filters: initialFilters }: Props) {
    // 1. Toda la lógica se extrae a los hooks. El componente principal es limpio.
    const { filters, handleFilterChange, clearFilters } = usePurchaseFilters(initialFilters);
    const actions = usePurchaseActions();

    // 2. Los cálculos complejos se mantienen aislados con useMemo.
    const stats = React.useMemo(() => {
        const totalBalance = compras.data.reduce((sum, p) => sum + p.true_balance, 0);
        const draftCount = compras.data.filter(p => p.status === 'draft').length;
        const totalPurchasedInPeriod = compras.data.reduce((sum, p) => sum + p.grand_total, 0);
        return { totalBalance, draftCount, totalPurchasedInPeriod };
    }, [compras.data]);

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
                                {compras.total > 0 && `Mostrando ${compras.from}-${compras.to} de ${compras.total} registros`}
                            </p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={PurchaseController.create.url()}>Nueva Compra</Link>
                    </Button>
                </div>

                {/* --- KPIS CARDS --- */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard title="Total Comprado (Período)" value={money(stats.totalPurchasedInPeriod)} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Balance Pendiente Total" value={money(stats.totalBalance)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Compras en Borrador" value={String(stats.draftCount)} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
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
                        {compras.data.length > 0 ? (
                            <>
                                {/* --- VISTA DE TABLA Y MÓVIL --- */}
                                <div className="hidden lg:block">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Código</TableHead>
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Factura / Fecha</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Devolucion</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {compras.data.map((p) => <PurchaseRow key={p.id} purchase={p} actions={actions} />)}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="lg:hidden p-4 space-y-4">
                                    {compras.data.map((p) => <MobilePurchaseCard key={p.id} purchase={p} actions={actions} />)}
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