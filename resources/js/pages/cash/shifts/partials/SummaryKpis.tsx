import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, PiggyBank, Wallet, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper de formato
const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

// Props que el componente necesita
interface SummaryKpisProps {
    salesCount: number;
    expected: number;
    counted: number;
    variance: number;
}

// Sub-componente para una tarjeta individual para no repetir código
const KpiCard = ({ title, value, icon: Icon, colorClass }: {
    title: string;
    value: string;
    icon: React.ElementType;
    colorClass?: string;
}) => (
    <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", colorClass)}>
                {value}
            </div>
        </CardContent>
    </Card>
);

// Componente principal que renderiza la cuadrícula
export function SummaryKpis({ salesCount, expected, counted, variance }: SummaryKpisProps) {
    const varianceColor = variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-rose-600' : '';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
                title="Ventas Totales"
                value={`${salesCount}`}
                icon={Receipt}
            />
            <KpiCard
                title="Monto Esperado"
                value={money(expected)}
                icon={PiggyBank}
            />
            <KpiCard
                title="Monto Contado"
                value={money(counted)}
                icon={Wallet}
            />
            <KpiCard
                title="Variación"
                value={money(variance)}
                icon={Scale}
                colorClass={varianceColor}
            />
        </div>
    );
}