// resources/js/pages/purchases/returns/index.tsx
import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Package, FileText, ArrowLeftRight } from "lucide-react";
import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";
import type { BreadcrumbItem, Paginated } from "@/types";

interface Row {
    id: number;
    code: string;
    status: "draft" | "completed" | "cancelled";
    total_value: string | number;
    return_date: string;
    store: { id: number; name: string };
    user?: { id: number; name: string } | null;
    purchase: { id: number; code: string };
}
interface Props {
    returns: Paginated<Row>;
    stats: { count: number; units: number; value: number };
    filters: { from: string; to: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Devoluciones", href: PurchaseReturnController.index.url() }];

export default function Index({ returns, stats, filters }: Props) {
    const [range, setRange] = React.useState({
        from: filters.from ? new Date(filters.from) : new Date(),
        to: filters.to ? new Date(filters.to) : new Date()
    });

    const onRange = (r: { from?: Date; to?: Date } | undefined) => {
        if (!r?.from || !r?.to) return;
        setRange({ from: r.from, to: r.to });
        router.get(PurchaseReturnController.index.url(), {
            from: r.from.toISOString().slice(0, 10),
            to: r.to.toISOString().slice(0, 10),
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Devoluciones de Compra" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ArrowLeftRight className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Devoluciones de Compra</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <DateRangePicker date={range} onDateChange={onRange} />
                        <Link href={PurchaseReturnController.create.url()}>
                            <Button>Nueva Devolución</Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardHeader><CardTitle>Devoluciones</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.count}</div></CardContent></Card>
                    <Card><CardHeader><CardTitle>Unidades</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.units.toLocaleString()}</div></CardContent></Card>
                    <Card><CardHeader><CardTitle>Valor</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">RD${Number(stats.value).toFixed(2)}</div></CardContent></Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Compra</TableHead>
                                    <TableHead>Tienda</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.data.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{new Date(r.return_date).toLocaleDateString('es-DO')}</TableCell>
                                        <TableCell className="font-mono">{r.code}</TableCell>
                                        <TableCell>{r.purchase.code}</TableCell>
                                        <TableCell>{r.store.name}</TableCell>
                                        <TableCell>{r.user?.name ?? 'N/A'}</TableCell>
                                        <TableCell className="text-right">RD${Number(r.total_value).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={PurchaseReturnController.show({ return: r.id })}>
                                                <Button size="icon" variant="outline"><FileText className="h-4 w-4" /></Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination className="mt-4" links={returns.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
