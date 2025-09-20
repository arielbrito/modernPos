import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const money = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(n || 0));

const KpiCard = ({ title, value, icon: Icon, colorClass }) => (
    <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${colorClass || 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export function KpiCards({ kpis }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Ventas Totales" value={money(kpis.total_sales)} icon={DollarSign} colorClass="text-emerald-500" />
            <KpiCard title="Variación Neta" value={money(kpis.net_variance)} icon={TrendingUp} colorClass={kpis.net_variance < 0 ? 'text-rose-500' : 'text-emerald-500'} />
            <KpiCard title="Turnos con Faltante" value={kpis.shifts_with_shortage} icon={TrendingDown} colorClass="text-rose-500" />
            <KpiCard title="Turnos con Sobrante" value={kpis.shifts_with_surplus} icon={AlertCircle} colorClass="text-amber-500" />
        </div>
    );
}