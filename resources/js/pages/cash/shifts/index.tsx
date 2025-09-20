/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Head, Link } from '@inertiajs/react';

// Layouts y Tipos
import AppLayout from '@/layouts/app-layout';
import { PaginatedResponse, BreadcrumbItem, User, Store } from '@/types';
import CashShiftController from '@/actions/App/Http/Controllers/Cash/CashShiftController';
import CashShiftReportController from '@/actions/App/Http/Controllers/Cash/CashShiftReportController';

// Hooks y Componentes Parciales
import { useShiftFilters } from './hooks/useShiftFilters';
import { KpiCards } from './partials/KpiCards';
import { Filters } from './partials/Filters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paginator } from '@/components/ui/paginator';
import { Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper
const money = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(n || 0));
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' });

// Props
interface IndexProps {
    shifts: PaginatedResponse<any>; // Deberías crear un tipo específico para el Shift del listado
    kpis: any;
    filters: Record<string, any>;
    users: User[];
    stores: Store[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja',
        href: ''
    },
    { title: 'Historial de Cierres', href: CashShiftController.index.url() },
];

export default function ShiftIndexPage({ shifts, kpis, filters: initialFilters, users, stores }: IndexProps) {
    const filters = useShiftFilters(initialFilters);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Cierres de Turno" />

            <div className="max-w-7xl mx-auto space-y-6 py-10 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold">Historial de Cierres de Turno</h1>

                <KpiCards kpis={kpis} />

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Filters filters={filters} users={users} stores={stores} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultados ({shifts.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Turno</TableHead>
                                        <TableHead>Caja / Tienda</TableHead>
                                        <TableHead>Cajero</TableHead>
                                        <TableHead>Fecha de Cierre</TableHead>
                                        <TableHead className="text-right">Variación</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shifts.data.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>
                                    ) : (
                                        shifts.data.map(shift => {
                                            const variance = shift.meta?.variance?.net_variance ?? 0;
                                            return (
                                                <TableRow key={shift.id}>
                                                    <TableCell className="font-medium">#{shift.id}</TableCell>
                                                    <TableCell>
                                                        <div>{shift.register.name}</div>
                                                        <div className="text-xs text-muted-foreground">{shift.register.store.name}</div>
                                                    </TableCell>
                                                    <TableCell>{shift.closed_by.name}</TableCell>
                                                    <TableCell>{formatDate(shift.closed_at)}</TableCell>
                                                    <TableCell className={cn(
                                                        'text-right font-semibold tabular-nums',
                                                        variance < 0 && 'text-destructive',
                                                        variance > 0 && 'text-emerald-600'
                                                    )}>
                                                        {variance !== 0 && <AlertCircle className="h-3 w-3 inline-block mr-1" />}
                                                        {money(variance)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={CashShiftReportController.show.url({ shift: shift.id })}>
                                                                <Eye className="mr-2 h-4 w-4" /> Ver Reporte
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {shifts.links.length > 3 && (
                        <div className="border-t p-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Mostrando {shifts.from} a {shifts.to} de {shifts.total} resultados
                            </span>
                            <Paginator links={shifts.links} />
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}