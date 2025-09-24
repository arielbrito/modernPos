import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";

export function FinancialSummaryCard({ purchase }: { purchase: Purchase }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Resumen Financiero
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(toNum(purchase.subtotal))}</span>
                </div>
                {toNum(purchase.discount_total) > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>Descuentos</span>
                        <span>- {money(toNum(purchase.discount_total))}</span>
                    </div>
                )}
                {toNum(purchase.tax_total) > 0 && (
                    <div className="flex justify-between">
                        <span>Impuestos</span>
                        <span>{money(toNum(purchase.tax_total))}</span>
                    </div>
                )}
                {(toNum(purchase.freight) + toNum(purchase.other_costs)) > 0 && (
                    <div className="flex justify-between">
                        <span>Flete y Otros</span>
                        <span>{money(toNum(purchase.freight) + toNum(purchase.other_costs))}</span>
                    </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                    <span>Total General</span>
                    <span>{money(toNum(purchase.grand_total))}</span>
                </div>
                {toNum(purchase.paid_total) > 0 && (
                    <div className="flex justify-between">
                        <span>Pagado</span>
                        <span className="font-medium text-green-600">
                            {money(toNum(purchase.paid_total))}
                        </span>
                    </div>
                )}
                <div className={`flex justify-between font-bold ${toNum(purchase.balance_total) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    <span>Balance Pendiente</span>
                    <span>{money(toNum(purchase.balance_total))}</span>
                </div>
            </CardContent>
        </Card>
    );
}