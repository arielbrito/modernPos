import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


export default function RefundSummary({ totals, currency }: {
    totals: { subtotal: number; tax: number; discount: number; total: number };
    currency: string;
}) {
    const Row = ({ label, value }: { label: string; value: number }) => (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-medium">{currency} {value.toFixed(2)}</span>
        </div>
    );


    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    <Row label="Subtotal" value={totals.subtotal} />
                    <Row label="Impuestos" value={totals.tax} />
                    <Row label="Descuentos" value={totals.discount} />
                    <div className="h-px bg-border my-2" />
                    <Row label="Total a reintegrar" value={totals.total} />
                </div>
            </CardContent>
        </Card>
    );
}