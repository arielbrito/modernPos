import React from 'react';
import { Button } from '@/components/ui/button';

const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

interface CurrencyTabButtonProps {
    currency: string;
    total: number;
    isActive: boolean;
    onClick: () => void;
    expected?: number;
}

export function CurrencyTabButton({ currency, total, isActive, onClick, expected }: CurrencyTabButtonProps) {
    const difference = total - (expected ?? 0);
    const differenceColor = difference === 0 ? '' : difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return (
        <Button
            variant={isActive ? "default" : "outline"}
            size="lg"
            className={`h-auto p-4 flex flex-col items-center gap-2 min-w-[120px] transition-all ${isActive ? 'ring-2 ring-primary/30 shadow-md' : 'hover:bg-muted'}`}
            onClick={onClick}
        >
            <div className="text-sm font-medium opacity-90">{currency}</div>
            <div className="font-bold text-lg tabular-nums">{money(total, currency)}</div>
            <div className={`text-xs font-semibold ${differenceColor}`}>
                {difference === 0 ? "OK" : difference > 0 ? `+${money(difference, currency)}` : money(difference, currency)}
            </div>
        </Button>
    );
}