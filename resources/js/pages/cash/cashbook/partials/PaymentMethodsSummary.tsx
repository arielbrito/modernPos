import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, DollarSign, Receipt } from 'lucide-react';
import type { Shift, PaymentsAggRow } from '@/types'; // Ajusta la ruta si es necesario

interface PaymentMethodsSummaryProps {
    flow: {
        payments_by_method: PaymentsAggRow[];
        cash_in_active_currency: number;
        non_cash_in_sale_ccy: number;
    };
    currency: string;
    shift: Shift | null;
}

const money = (n: number, c: string) => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

export function PaymentMethodsSummary({ flow, currency, shift }: PaymentMethodsSummaryProps) {
    if (!flow) return null; // No renderizar nada si no hay datos de flujo

    return (
        <Card className="shadow-sm border-0 pos-card  h-full">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-slate-800 bg dark:text-slate-200">
                    <div className="p-2 bg-accent rounded-lg">
                        <Calculator className="h-5 w-5 text-slate-600 dark:text-secondary " />
                    </div>
                    <span className="text-lg">Resumen por Método</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 pos-badge-success rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Efectivo ({currency})
                        </span>
                    </div>
                    <span className="text-lg font-bold text-green-700 dark:text-green-300 tabular-nums">
                        {money(flow.cash_in_active_currency, currency)}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 pos-badge-warning rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-background rounded">
                            <Receipt className="h-4 w-4 text-foreground" />
                        </div>
                        <span className="text-sm font-medium ">
                            Tarjeta/Otros ({shift?.currency_code ?? "DOP"})
                        </span>
                    </div>
                    <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                        {money(flow.non_cash_in_sale_ccy, shift?.currency_code ?? "DOP")}
                    </span>
                </div>

                {flow.payments_by_method.length > 0 && (
                    <div className="pt-2 space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Detalle por método:</h4>
                        <ScrollArea className="h-32">
                            <div className="pr-4 space-y-1">
                                {flow.payments_by_method.map((method, index) => (
                                    <div key={index} className="flex justify-between items-center py-1 text-xs">
                                        <span className="capitalize text-muted-foreground">
                                            {method.method} ({method.currency_code}) - {method.count}x
                                        </span>
                                        <span className="font-mono font-medium">
                                            {money(Number(method.amount), method.currency_code)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}