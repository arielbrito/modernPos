import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShiftSummary } from '@/types'; // Ajusta la ruta si es necesario

// --- PROPS ---
interface StatsGridProps {
    summary: ShiftSummary;
    currency: string;
    isRefreshing: boolean;
}

// --- HELPER ---
const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

// --- SUB-COMPONENTE PARA CADA TARJETA ---
const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }: {
    title: string;
    value: string;
    icon: React.ElementType;
    colorClass: string;
    isLoading: boolean;
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="ml-4 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center">
                    <div className={cn('p-2 rounded-lg', colorClass.replace('text-', 'bg-') + '/10')}>
                        <Icon className={cn('h-6 w-6', colorClass)} />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-xl font-bold tabular-nums">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// --- COMPONENTE PRINCIPAL ---
export function StatsGrid({ summary, currency, isRefreshing }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Saldo Inicial"
                value={money(summary.opening, currency)}
                icon={Wallet}
                colorClass="text-blue-600"
                isLoading={isRefreshing}
            />
            <StatCard
                title="Ingresos del Turno"
                value={money(summary.income, currency)}
                icon={TrendingUp}
                colorClass="text-emerald-600"
                isLoading={isRefreshing}
            />
            <StatCard
                title="Egresos del Turno"
                value={money(summary.expense_visible ?? summary.expense, currency)}
                icon={TrendingDown}
                colorClass="text-rose-600"
                isLoading={isRefreshing}
            />
            <StatCard
                title="Cierre Estimado"
                value={money(summary.cash_in_hand, currency)}
                icon={Calculator}
                colorClass="text-indigo-600"
                isLoading={isRefreshing}
            />
        </div>
    );
}