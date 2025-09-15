/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { SVGProps } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { List, TrendingUp, AlertTriangle, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
    stats: any; // Deberías crear un tipo específico para `storeStats`
    categoriesCount: number;
    lowStockCount: number;
}

// Sub-componente para una tarjeta de estadística individual
const StatCard = ({ title, value, icon, colorClass }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
}) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center">
                <div className={cn('p-2 rounded-lg', `${colorClass}/10`)}>
                    {React.cloneElement(icon as React.ReactElement<SVGProps<SVGSVGElement>>, { className: cn('h-6 w-6', colorClass) })}
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

// Componente principal que renderiza las 4 tarjetas
export function StatsCards({ stats, categoriesCount, lowStockCount }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Productos"
                value={stats?.current?.catalog_products ?? 0}
                icon={<List />}
                colorClass="text-primary"
            />
            <StatCard
                title="Productos Activos"
                value={stats?.current?.catalog_active_products ?? 0}
                icon={<TrendingUp />}
                colorClass="text-green-500"
            />
            <StatCard
                title="Stock Bajo"
                value={lowStockCount}
                icon={<AlertTriangle />}
                colorClass="text-destructive"
            />
            <StatCard
                title="Categorías"
                value={categoriesCount}
                icon={<Grid3X3 />}
                colorClass="text-blue-500"
            />
        </div>
    );
}