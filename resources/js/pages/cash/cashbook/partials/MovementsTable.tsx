/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDownCircle, ArrowUpCircle, Clock, User, Receipt, TrendingUp, TrendingDown, Search } from 'lucide-react';
import type { Movement } from '@/types';

// --- PROPS ---
interface MovementsTableProps {
    title: string;
    movements: Movement[];
    currency: string;
    isRefreshing: boolean;
    accentColor: 'green' | 'red';
    searchValue: string;
    onSearchChange: (value: string) => void;
}

// --- HELPER ---
const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

// --- SUB-COMPONENTES INTERNOS ---
const TableSkeleton = () => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

const MovementRow = React.memo(({ movement }: { movement: Movement }) => {
    const isIncome = movement.direction === "in";
    return (
        <TableRow className="hover:bg-muted/50">
            <TableCell className="py-3">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${isIncome ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                        {isIncome ? <ArrowDownCircle className="h-4 w-4 text-green-600" /> : <ArrowUpCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                        <div className="font-medium truncate">{movement.reason ?? (isIncome ? "Ingreso" : "Salida")}</div>
                        <div className="text-xs text-muted-foreground truncate">{new Date(movement.created_at).toLocaleString()}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className={`font-semibold text-lg tabular-nums ${isIncome ? "text-green-600" : "text-red-600"}`}>
                    {money(movement.amount, movement.pay_currency || 'DOP')}
                </div>
            </TableCell>
        </TableRow>
    );
});

// --- COMPONENTE PRINCIPAL ---
export function MovementsTable({ title, movements, currency, isRefreshing, accentColor, searchValue, onSearchChange }: MovementsTableProps) {
    const totalAmount = useMemo(() =>
        movements.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
        [movements]
    );

    const accentClasses = {
        green: {
            card: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
            header: 'border-green-100 dark:border-green-800',
            title: 'text-green-800 dark:text-green-200',
            iconBg: 'bg-green-100 dark:bg-green-900',
            icon: 'text-green-600 dark:text-green-400',
            tableHeader: 'bg-green-50 dark:bg-green-950/80',
            tableHeaderText: 'text-green-700 dark:text-green-300',
            footer: 'border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50',
        },
        red: {
            card: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950',
            header: 'border-red-100 dark:border-red-800',
            title: 'text-red-800 dark:text-red-200',
            iconBg: 'bg-red-100 dark:bg-red-900',
            icon: 'text-red-600 dark:text-red-400',
            tableHeader: 'bg-red-50 dark:bg-red-950/80',
            tableHeaderText: 'text-red-700 dark:text-red-300',
            footer: 'border-red-100 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50',
        }
    };
    const styles = accentClasses[accentColor];
    const Icon = accentColor === 'green' ? TrendingUp : TrendingDown;



    return (
        <Card className={`shadow-sm border-0 ${styles.card}`}>
            <CardHeader className={`pb-4 border-b ${styles.header}`}>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <CardTitle className={`flex items-center gap-3 ${styles.title}`}>
                        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                            <Icon className={`h-5 w-5 ${styles.icon}`} />
                        </div>
                        <span className="text-base sm:text-lg">{title}</span>
                    </CardTitle>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={`Buscar en ${title.toLowerCase()}...`}
                            className="pl-10 w-full sm:w-[240px] bg-white/70 dark:bg-slate-900/70"
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    {isRefreshing ? <div className="p-4"><TableSkeleton /></div> : (
                        <Table>
                            <TableBody>
                                {movements.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="h-48 text-center text-muted-foreground">No hay movimientos registrados.</TableCell></TableRow>
                                ) : (
                                    movements.map(m => <MovementRow key={m.id} movement={m} />)
                                )}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </CardContent>
            <div className={`px-6 py-3 border-t ${styles.footer}`}>
                <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${styles.title}`}>Total de {title.toLowerCase()}:</span>
                    <span className={`text-xl font-bold tabular-nums ${styles.title}`}>{money(totalAmount, currency)}</span>
                </div>
            </div>
        </Card>
    );


}