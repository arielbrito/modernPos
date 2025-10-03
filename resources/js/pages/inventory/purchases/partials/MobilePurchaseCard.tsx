import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import { money, toNum } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";

interface Props {
    purchase: Purchase & { returns_total: number | null; true_balance: number };
    actions: ReturnType<typeof usePurchaseActions>;
}

export const MobilePurchaseCard = React.memo(({ purchase, actions }: Props) => {
    const isApproving = actions.loadingStates.approving === purchase.id;
    const isCancelling = actions.loadingStates.cancelling === purchase.id;
    const isLoading = isApproving || isCancelling;

    const invoiceNumber = purchase.invoice_number ?? "N/A";
    const invoiceDate = purchase.invoice_date ? fmtDate(purchase.invoice_date) : "Sin fecha";

    const total = toNum(purchase.grand_total);
    const returns = toNum(purchase.returns_total ?? 0);
    const balance = toNum(purchase.true_balance);

    return (
        <Card
            className={`transition-opacity ${isLoading ? "opacity-60" : "opacity-100"}`}
            aria-busy={isLoading}
            data-testid={`purchase-card-${purchase.id}`}
        >
            <CardContent className="p-4 space-y-4">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-mono text-sm font-bold truncate" title={purchase.code}>
                            {purchase.code}
                        </div>
                        <div className="text-sm text-muted-foreground truncate" title={purchase.supplier?.name ?? ""}>
                            {purchase.supplier?.name}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={purchase.status} />
                        <ActionMenu purchase={purchase} actions={actions} />
                    </div>
                </div>

                {/* Factura / Fecha + Balance */}
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                    <div>
                        <div className="text-muted-foreground mb-1">Factura / Fecha</div>
                        <div className="font-medium">{invoiceNumber}</div>
                        <div>{invoiceDate}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-muted-foreground mb-1">Balance Real</div>
                        <div className={`font-mono font-bold text-lg ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
                            {money(balance)}
                        </div>
                    </div>
                </div>

                {/* Totales compactos */}
                <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm rounded-md border p-3 bg-muted/30">
                    <div className="text-center">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-medium">{money(total)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Devolución</div>
                        <div className={`font-medium ${returns > 0 ? "text-amber-600" : ""}`}>{money(returns)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Balance</div>
                        <div className={`font-semibold ${balance > 0 ? "text-destructive" : "text-green-600"}`}>{money(balance)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
