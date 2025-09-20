import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CountDetailData } from '../types/shift-types'; // Asegúrate que la ruta a tus tipos sea correcta

// Helper de formato
const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

interface CountDetailsProps {
    openingData: CountDetailData | null;
    closingData: CountDetailData | null;
}

// Sub-componente para la tarjeta de detalle, que usaremos para apertura y cierre
const CountDetailCard = ({ title, countData }: { title: string; countData: CountDetailData | null }) => {
    if (!countData || Object.keys(countData.by_currency).length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground text-center p-4">No hay datos de conteo.</p></CardContent>
            </Card>
        );
    }

    const currencyBreakdown = Object.entries(countData.by_currency);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <p className="text-2xl font-bold text-primary pt-1">{money(countData.totals, 'DOP')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {currencyBreakdown.map(([ccy, data]) => {
                    const lines = (data.lines || []).filter((l) => l.qty > 0);
                    if (lines.length === 0) return null;

                    return (
                        <div key={ccy}>
                            <div className="flex justify-between font-medium border-b pb-2 mb-2">
                                <span>Moneda: {ccy}</span>
                                <span>{money(data.total, ccy)}</span>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Denominación</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((ln, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{`${ln.kind === "bill" ? "Billete" : "Moneda"} de ${money(ln.denomination, ccy)}`}</TableCell>
                                            <TableCell className="text-right">{ln.qty}</TableCell>
                                            <TableCell className="text-right tabular-nums">{money(ln.subtotal, ccy)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

// Componente principal que renderiza ambas tarjetas
export function CountDetails({ openingData, closingData }: CountDetailsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CountDetailCard title="Detalle del Conteo de Apertura" countData={openingData} />
            <CountDetailCard title="Detalle del Conteo de Cierre" countData={closingData} />
        </div>
    );
}