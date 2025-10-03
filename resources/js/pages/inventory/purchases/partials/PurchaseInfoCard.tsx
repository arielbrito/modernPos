// resources/js/pages/inventory/purchases/partials/PurchaseInfoCard.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";
import { StatusBadge } from "./StatusBadge"; // <-- Corrige el path/case aquí
import type { Purchase, PurchaseItem } from "@/types";
import { fmtDate } from "@/utils/date";
import { toNum } from "@/utils/inventory";

const ReceiptProgress: React.FC<{ items: PurchaseItem[] }> = ({ items }) => {
    const totalOrdered = items.reduce((sum, item) => sum + toNum(item.qty_ordered), 0);
    const totalReceived = items.reduce((sum, item) => sum + toNum(item.qty_received), 0);

    let progress = 0;
    if (totalOrdered > 0) {
        progress = Math.min(100, Math.max(0, (totalReceived / totalOrdered) * 100));
    }

    return (
        <div className="space-y-2" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso de recepción</span>
                <span className="font-medium">
                    {totalReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} /{" "}
                    {totalOrdered.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
            </div>
            <Progress
                value={progress}
                className="h-2"
                aria-label="Progreso de recepción"
                title={`${progress.toFixed(0)}%`}
            />
        </div>
    );
};

export function PurchaseInfoCard({ purchase }: { purchase: Purchase }) {
    const invoiceDateStr = purchase.invoice_date ? fmtDate(purchase.invoice_date) : "—";
    const supplierName = purchase.supplier?.name ?? "—";
    const invoiceNumber = purchase.invoice_number ?? "—";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Información de la compra
                </CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-muted-foreground">Código</div>
                    <div className="font-mono font-medium">{purchase.code}</div>
                </div>

                <div>
                    <div className="text-muted-foreground">Estado</div>
                    <div className="mt-0.5">
                        <StatusBadge status={purchase.status} />
                    </div>
                </div>

                <div className="col-span-2">
                    <div className="text-muted-foreground">Proveedor</div>
                    <div className="font-medium">{supplierName}</div>
                </div>

                <div>
                    <div className="text-muted-foreground">Factura N°</div>
                    <div className="font-medium">{invoiceNumber}</div>
                </div>

                <div>
                    <div className="text-muted-foreground">Fecha factura</div>
                    <div className="font-medium">{invoiceDateStr}</div>
                </div>

                {purchase.items.length > 0 && (
                    <div className="col-span-2 pt-2">
                        <ReceiptProgress items={purchase.items} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
