import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";

// --- LAYOUT, COMPONENTS & ICONS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, Plus, ArrowUp, ArrowDown, TrendingUp, TrendingDown, FilePlus, Users, Eye } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker" // Asumiendo que tienes este componente

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, Paginated, InventoryAdjustment, User, Store } from "@/types";
import { money, toNum } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";


interface Props {
    adjustments: Paginated<InventoryAdjustment & { items_count: number; user: User; store: Store; }>;
    stats: {
        total_units_in: number;
        total_units_out: number;
        total_value_in: number;
        total_value_out: number;
        net_value_change: number;
        count: number;
    };
    filters: { from: string; to: string; };
}

const StatCard = ({ title, value, icon, trend, trendValue }: { title: string; value: string; icon: React.ReactNode; trend?: 'up' | 'down'; trendValue?: string; }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {trend && <p className="text-xs text-muted-foreground">{trendValue}</p>}
        </CardContent>
    </Card>
);

const breadcrumbs: BreadcrumbItem[] = [{ title: "Ajustes de Inventario", href: InventoryAdjustmentController.index.url() }];

export default function IndexInventoryAdjustments({ adjustments, stats, filters }: Props) {
    const [localFilters, setLocalFilters] = React.useState(() => ({
        from: filters.from ? new Date(filters.from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: filters.to ? new Date(filters.to) : new Date(),

    }));

    const debouncedSubmit = useDebouncedCallback((newFilters) => {
        router.get(InventoryAdjustmentController.index.url(), newFilters, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    }, 500);


    const handleFilterChange = (newFilterValues: typeof localFilters) => {
        // Actualizamos la UI inmediatamente
        setLocalFilters(newFilterValues);

        // Preparamos el payload y llamamos a la función debounced
        debouncedSubmit({
            from: newFilterValues.from.toISOString().split('T')[0],
            to: newFilterValues.to.toISOString().split('T')[0],
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ajustes de Inventario" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* --- ENCABEZADO Y ACCIONES --- */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Ajustes de Inventario</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <DateRangePicker
                            date={{ from: localFilters.from, to: localFilters.to }}
                            // --- CORRECCIÓN AQUÍ ---
                            onDateChange={(range) => {
                                if (range?.from && range?.to) {
                                    handleFilterChange({ ...localFilters, from: range.from, to: range.to });
                                }
                            }}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Nuevo Ajuste
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={InventoryAdjustmentController.create.url()}>
                                        <FilePlus className="mr-2 h-4 w-4" /> Ajuste Simple
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={InventoryAdjustmentController.bulkCreate.url()}>
                                        <Users className="mr-2 h-4 w-4" /> Ajuste Masivo (Conteo)
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* --- KPIs --- */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Unidades Entradas" value={stats.total_units_in.toLocaleString()} icon={<ArrowUp className="h-4 w-4 text-green-500" />} />
                    <StatCard title="Unidades Salidas" value={stats.total_units_out.toLocaleString()} icon={<ArrowDown className="h-4 w-4 text-red-500" />} />
                    <StatCard title="Valor Neto del Ajuste" value={money(stats.net_value_change)} icon={stats.net_value_change >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />} />
                    <StatCard title="Total de Ajustes" value={stats.count.toLocaleString()} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
                </div>

                {/* --- TABLA DE AJUSTES --- */}
                <Card>
                    <CardHeader><CardTitle>Historial de Ajustes</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead>Tienda</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="text-right"># Items</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adjustments.data.length > 0 ? adjustments.data.map(adj => (
                                    <TableRow key={adj.id}>
                                        <TableCell>{fmtDate(adj.adjustment_date)}</TableCell>
                                        <TableCell className="font-mono">{adj.code}</TableCell>
                                        <TableCell>{adj.reason}</TableCell>
                                        <TableCell>{adj.store.name}</TableCell>
                                        <TableCell>{adj.user?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{adj.items_count}</TableCell>
                                        <TableCell className="text-right">

                                            <Link href={InventoryAdjustmentController.show({ adjustment: Number(adj.id) })}>
                                                <Button size={'icon'} variant={'default'}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>

                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay ajustes en el período seleccionado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination className="mt-4" links={adjustments.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}