// index.tsx
import * as React from "react";
import { Head, Link } from "@inertiajs/react";
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
import { Package, DollarSign, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import type { BreadcrumbItem, Paginated, Purchase } from "@/types";
import { money } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { withQuery } from "@/lib/withQuery";
import { usePurchaseFilters } from "./hooks/usePurchaseFilters";
import { usePurchaseActions } from "./hooks/usePurchaseActions";

type EmailFilter = 'all' | 'sent' | 'queued' | 'failed' | 'never';

type Filters = {
    search: string;
    status: string;
    email?: EmailFilter; // si tienes el filtro de email
};

type ServerStats = {
    totalPurchasedInPeriod: number;
    totalBalance: number;
    draftCount: number;
};

interface Props {
    compras: Paginated<Purchase & { returns_total: number | null; true_balance: number }>;
    filters: Filters;
    stats: ServerStats;  // <-- viene del backend
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Compras", href: PurchaseController.index.url() }];

export default function IndexPurchases({ compras, filters: initialFilters, stats }: Props) {
    // si tienes filtro de email en UI, inclúyelo en usePurchaseFilters
    const { filters, handleFilterChange, clearFilters } = usePurchaseFilters(initialFilters as any);
    const actions = usePurchaseActions();

    // URLs de exportación con filtros actuales
    const csvUrl = withQuery(PurchaseController.exportIndexCsv.url(), { search: filters.search, status: filters.status /*, email: filters.email*/ });
    const xlsxUrl = withQuery(PurchaseController.exportIndexXlsx.url(), { search: filters.search, status: filters.status /*, email: filters.email*/ });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compras" />

            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* Banda superior con branding */}
                <div className="gradient-stoneretail rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-foreground/10 p-2 text-foreground">
                            <Package className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de Compras</h1>
                            <p className="text-sm text-muted-foreground">
                                {compras.total > 0 && `Mostrando ${compras.from}-${compras.to} de ${compras.total} registros`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3" />
                        <div className="flex items-center gap-2">
                            <Button asChild>
                                <Link href={PurchaseController.create.url()}>Nueva Compra</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <a href={csvUrl}><Download className="h-4 w-4 mr-2" />CSV</a>
                            </Button>
                            <Button asChild variant="outline">
                                <a href={xlsxUrl}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPIs usando los números del servidor */}
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

                {/* Lista / Tabla */}
                <section className="pos-card">
                    <CardHeader className="border-b">
                        <CardTitle className="text-base">Listado</CardTitle>

                        <SearchFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                        />

                    </CardHeader>

                    <CardContent className="p-0">
                        {compras.data.length > 0 ? (
                            <>
                                <div className="hidden lg:block overflow-x-auto scrollbar-stoneretail">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card z-10">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Código</TableHead>
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Factura / Fecha</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Devolución</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="text-right">Correo</TableHead>
                                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <tbody>
                                            {compras.data.map((p) => (
                                                <PurchaseRow key={p.id} purchase={p} actions={actions} />
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>

                                <div className="lg:hidden p-4 space-y-4">
                                    {compras.data.map((p) => (
                                        <MobilePurchaseCard key={p.id} purchase={p} actions={actions} />
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
                </section>
            </div>
        </AppLayout>
    );
}
