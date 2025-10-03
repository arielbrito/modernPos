import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PackageCheck } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";

type Props = {
    purchase: Purchase;
    pendingItemsCount: number;
    /** Texto de moneda para mostrar (ej. "RD$"); si no se pasa se usa sólo el número */
    currencyLabel?: string;
    /** Acción para abrir modal de pago (opcional) */
    onPayClick?: () => void;
    /** Acción para abrir modal de recibir (opcional) */
    onReceiveClick?: () => void;
};

export function PurchaseAlerts({
    purchase,
    pendingItemsCount,
    currencyLabel,
    onPayClick,
    onReceiveClick,
}: Props) {
    const balance = toNum(purchase.balance_total);
    const hasPendingPayment = balance > 0 && purchase.status === "received";
    const hasPendingItems =
        pendingItemsCount > 0 && ["approved", "partially_received"].includes(purchase.status);

    if (!hasPendingPayment && !hasPendingItems) return null;

    const fmtMoney = (n: number) =>
        currencyLabel ? `${currencyLabel}${money(n)}` : money(n);

    return (
        <div className="space-y-4">
            {hasPendingPayment && (
                <Alert variant="destructive" className="border-orange-300">
                    <AlertTriangle className="h-4 w-4" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <AlertTitle>Pago pendiente</AlertTitle>
                            <AlertDescription>
                                Esta compra tiene un balance pendiente de <strong>{fmtMoney(balance)}</strong>.
                            </AlertDescription>
                        </div>
                        {onPayClick && (
                            <Button variant="outline" size="sm" onClick={onPayClick}>
                                Registrar pago
                            </Button>
                        )}
                    </div>
                </Alert>
            )}

            {hasPendingItems && (
                <Alert className="border-blue-300 bg-blue-50 text-blue-900">
                    <PackageCheck className="h-4 w-4" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <AlertTitle>Productos pendientes de recepción</AlertTitle>
                            <AlertDescription>
                                Hay <strong>{pendingItemsCount}</strong> tipo(s) de producto(s) pendientes de recibir.
                            </AlertDescription>
                        </div>
                        {onReceiveClick && (
                            <Button variant="secondary" size="sm" onClick={onReceiveClick}>
                                Recibir ahora
                            </Button>
                        )}
                    </div>
                </Alert>
            )}
        </div>
    );
}
