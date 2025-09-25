import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";

interface Props {
    purchase: Purchase & { returns_total: number | null, true_balance: number };
    actions: ReturnType<typeof usePurchaseActions>;
}

export const MobilePurchaseCard = React.memo(({ purchase, actions }: Props) => {
    const isLoading = actions.loadingStates.approving === purchase.id || actions.loadingStates.cancelling === purchase.id;

    return (
        <Card className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="font-mono text-sm font-bold">{purchase.code}</div>
                        <div className="text-sm text-muted-foreground">{purchase.supplier?.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={purchase.status} />
                        <ActionMenu purchase={purchase} actions={actions} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                    <div>
                        <div className="text-muted-foreground mb-1">Factura / Fecha</div>
                        <div className="font-medium">{purchase.invoice_number || "N/A"}</div>
                        <div>{fmtDate(purchase.invoice_date) || "Sin fecha"}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-muted-foreground mb-1">Balance Real</div>
                        <div className="font-mono font-bold text-lg text-destructive">{money(purchase.true_balance)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});