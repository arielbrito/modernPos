import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";

// --- LAYOUT, COMPONENTS & ICONS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Undo2, DollarSign, ListChecks } from "lucide-react";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, Paginated, PurchaseReturn, Supplier } from "@/types";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    returns: Paginated<PurchaseReturn>;
    stats: {
        total_value_returned: number;
        count: number;
    };
    filters: { from?: string; to?: string; supplier_id?: string; };
    suppliers: Supplier[];
}

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode; }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const breadcrumbs: BreadcrumbItem[] = [{ title: "Devoluciones de Compra", href: PurchaseReturnController.index.url() }];

export default function IndexPurchaseReturns({ returns, stats, filters, suppliers }: Props) {
    const [localFilters, setLocalFilters] = React.useState(() => ({
        from: filters.from ? new Date(filters.from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: filters.to ? new Date(filters.to) : new Date(),
        supplier_id: filters.supplier_id || 'all',
    }));

    const debouncedSubmit = useDebouncedCallback((newFilters) => {
        router.get(PurchaseReturnController.index.url(), newFilters, {
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
            supplier_id: newFilterValues.supplier_id === 'all' ? undefined : newFilterValues.supplier_id,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Devoluciones de Compra" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Undo2 className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Historial de Devoluciones</h1>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Valor Total Devuelto" value={money(stats.total_value_returned)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Total Devoluciones" value={stats.count.toLocaleString()} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <DateRangePicker
                                date={{ from: localFilters.from, to: localFilters.to }}
                                // --- CORRECCIÓN AQUÍ ---
                                onDateChange={(range) => {
                                    if (range?.from && range?.to) {
                                        handleFilterChange({ ...localFilters, from: range.from, to: range.to });
                                    }
                                }}
                            />
                            <Select
                                value={localFilters.supplier_id}
                                onValueChange={v => handleFilterChange({ ...localFilters, supplier_id: v })}
                            >
                                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Filtrar por proveedor..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los proveedores</SelectItem>
                                    {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Código Dev.</TableHead>
                                    <TableHead>Compra Original</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.data.length > 0 ? returns.data.map(ret => (
                                    <TableRow key={ret.id}>
                                        <TableCell>{fmtDate(ret.return_date)}</TableCell>
                                        <TableCell className="font-mono">{ret.code}</TableCell>
                                        <TableCell>
                                            <Link href={PurchaseController.show.url({ purchase: ret.purchase_id })} className="font-mono text-primary hover:underline">
                                                {ret.purchase?.code}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{ret.purchase?.supplier?.name}</TableCell>
                                        <TableCell className="text-right font-medium">{money(ret.total_value)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay devoluciones en el período seleccionado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination className="mt-4" links={returns.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}