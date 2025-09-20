import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SummaryByCurrencyItem } from '../types/shift-types'; // Asegúrate que la ruta a tus tipos sea correcta

// Helper de formato
const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

interface SummaryTableProps {
    data: SummaryByCurrencyItem[];
}

export function SummaryTable({ data }: SummaryTableProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Resumen Financiero por Moneda</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground p-4 text-center">No hay datos de resumen disponibles.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen Financiero por Moneda</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Moneda</TableHead>
                            <TableHead className="text-right">Apertura</TableHead>
                            <TableHead className="text-right">Ingresos</TableHead>
                            <TableHead className="text-right">Egresos</TableHead>
                            <TableHead className="text-right font-semibold">Esperado</TableHead>
                            <TableHead className="text-right font-semibold">Contado</TableHead>
                            <TableHead className="text-right font-bold">Variación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.currency_code}>
                                <TableCell className="font-medium">{row.currency_code}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(row.opening, row.currency_code)}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(row.income, row.currency_code)}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(row.expense, row.currency_code)}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold">{money(Number(row.expected), row.currency_code)}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold">{money(Number(row.counted), row.currency_code)}</TableCell>
                                <TableCell className={`text-right tabular-nums font-bold ${row.variance > 0 ? 'text-emerald-600' : row.variance < 0 ? 'text-rose-600' : ''}`}>
                                    {money(row.variance, row.currency_code)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}