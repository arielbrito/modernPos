import * as React from "react";
import { AlertTriangle, PackageCheck } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";

interface Props {
    purchase: Purchase;
    pendingItemsCount: number;
}

export function PurchaseAlerts({ purchase, pendingItemsCount }: Props) {
    const hasPendingPayment = toNum(purchase.balance_total) > 0 && purchase.status === "received";
    const hasPendingItems = pendingItemsCount > 0 && ["approved", "partially_received"].includes(purchase.status);

    if (!hasPendingPayment && !hasPendingItems) {
        return null;
    }

    return (
        <div className="space-y-4">
            {hasPendingPayment && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                            <h3 className="text-sm font-semibold text-orange-800">Pago pendiente</h3>
                            <p className="text-sm text-orange-700">
                                Esta compra tiene un balance pendiente de <strong>{money(toNum(purchase.balance_total))}</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {hasPendingItems && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                        <PackageCheck className="h-5 w-5 text-blue-600" />
                        <div>
                            <h3 className="text-sm font-semibold text-blue-800">Productos pendientes de recepción</h3>
                            <p className="text-sm text-blue-700">
                                Hay <strong>{pendingItemsCount}</strong> tipo(s) de producto(s) pendientes de recibir.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}