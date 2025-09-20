import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PaymentRow } from '../types/shift-types'; // Asegúrate que la ruta a tus tipos sea correcta

// Helper de formato
const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

interface PaymentsTableProps {
    data: PaymentRow[];
}

export function PaymentsTable({ data }: PaymentsTableProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Detalle de Pagos por Método</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground p-4 text-center">
                        No se registraron pagos en este turno.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Detalle de Pagos por Método</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Método</TableHead>
                            <TableHead>Moneda</TableHead>
                            <TableHead className="text-right"># Pagos</TableHead>
                            <TableHead className="text-right">Monto Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium capitalize">{row.method}</TableCell>
                                <TableCell>{row.currency_code}</TableCell>
                                <TableCell className="text-right">{row.count}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {money(Number(row.amount), row.currency_code)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}