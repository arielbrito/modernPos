import React from 'react';
import { Link, usePage, router, Head } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SaleReturnController from '@/actions/App/Http/Controllers/Sales/SaleReturnController';
import { show } from '@/routes/sales/returns';
import AppLayout from "@/layouts/app-layout";
import { FileText } from 'lucide-react';

interface ReturnRow { id: number; sale_number?: string; customer?: string; currency_code: string; total_refund: number; tax_refund: number; cost_refund: number; created_at: string; }
interface PageProps extends Record<string, unknown> {
    filters: { q?: string; from?: string; to?: string; store_id?: number | string };
    kpis: { count: number; total: number; average: number; tax: number; cost: number; marginImpact: number };
    returns: { data: ReturnRow[]; links: any[] };
}

export default function Index() {
    const { props } = usePage<PageProps>();
    const { filters, kpis, returns } = props;

    const onFilter = (ev: React.FormEvent) => {
        ev.preventDefault();
        const form = ev.target as HTMLFormElement;
        const fd = new FormData(form);
        const data: any = Object.fromEntries(fd.entries());
        router.get(SaleReturnController.index.url(), data, { preserveState: true, replace: true });
    };

    const Kpi = ({ label, value }: { label: string; value: string | number }) => (
        <Card>
            <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
        </Card>
    );

    return (
        <AppLayout>
            <Head title="Devolucion de Ventas" />
            <div className="max-w-7xl mx-auto p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Devoluciones de Ventas</h1>
                    <div className="flex gap-2">
                        <Link href={SaleReturnController.exportListExcel.url()} className="underline text-sm">Exportar listado (Excel)</Link>
                    </div>
                </div>

                <form onSubmit={onFilter} className="grid md:grid-cols-5 gap-3">
                    <Input name="q" defaultValue={filters.q || ''} placeholder="Buscar #venta o cliente" />
                    <Input type="date" name="from" defaultValue={filters.from || ''} />
                    <Input type="date" name="to" defaultValue={filters.to || ''} />
                    <Input name="store_id" defaultValue={filters.store_id?.toString() || ''} placeholder="Tienda (ID)" />
                    <div className="flex gap-2">
                        <Button type="submit">Filtrar</Button>
                        <Button type="button" variant="secondary" onClick={() => router.get(SaleReturnController.index.url())}>Limpiar</Button>
                    </div>
                </form>

                <div className="grid md:grid-cols-5 gap-4">
                    <Kpi label="Devoluciones" value={kpis.count} />
                    <Kpi label="Total devuelto" value={kpis.total.toFixed(2)} />
                    <Kpi label="Promedio" value={kpis.average.toFixed(2)} />
                    <Kpi label="Impuestos reversados" value={kpis.tax.toFixed(2)} />
                    <Kpi label="Impacto margen" value={kpis.marginImpact.toFixed(2)} />
                </div>

                <Card>
                    <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground px-2">
                            <div className="col-span-2">Fecha</div>
                            <div className="col-span-2">Venta</div>
                            <div className="col-span-3">Cliente</div>
                            <div className="col-span-2 text-right">Total</div>
                            <div className="col-span-2 text-right">Impuesto</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y">
                            {returns.data.map(r => (
                                <div key={r.id} className="grid grid-cols-12 items-center py-2 px-2 text-sm">
                                    <div className="col-span-2">{r.created_at}</div>
                                    <div className="col-span-2">{r.sale_number ?? '#' + r.id}</div>
                                    <div className="col-span-3">{r.customer ?? '-'}</div>
                                    <div className="col-span-2 text-right">{r.currency_code} {r.total_refund.toFixed(2)}</div>
                                    <div className="col-span-2 text-right">{r.currency_code} {r.tax_refund.toFixed(2)}</div>
                                    <div className="col-span-1 text-right">
                                        <Link className="underline" href={show(r.id)}>Ver</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {returns.data.length === 0 && (
                            <div>
                                <div className="p-8 text-center">
                                    <div className="flex flex-col items-center space-y-2">
                                        <FileText className="h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500 font-medium">No se encontraron Devoluciones</p>
                                        <p className="text-gray-400 text-sm">Intenta modificar los filtros de búsqueda</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
