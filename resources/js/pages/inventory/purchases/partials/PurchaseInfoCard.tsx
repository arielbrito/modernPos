import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { Purchase, PurchaseItem } from "@/types";
import { fmtDate } from "@/utils/date";
import { toNum } from "@/utils/inventory";

const ReceiptProgress: React.FC<{ items: PurchaseItem[] }> = ({ items }) => {
    const totalOrdered = items.reduce((sum, item) => sum + toNum(item.qty_ordered), 0);
    const totalReceived = items.reduce((sum, item) => sum + toNum(item.qty_received), 0);
    const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso de Recepción</span>
                <span className="font-medium">{totalReceived.toLocaleString()} / {totalOrdered.toLocaleString()}</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
    );
};

export function PurchaseInfoCard({ purchase }: { purchase: Purchase }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Información de la Compra
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-muted-foreground">Código</div>
                    <div className="font-mono font-medium">{purchase.code}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">Estado</div>
                    <StatusBadge status={purchase.status} />
                </div>
                <div className="col-span-2">
                    <div className="text-muted-foreground">Proveedor</div>
                    <div className="font-medium">{purchase.supplier?.name}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">Factura N°</div>
                    <div className="font-medium">{purchase.invoice_number ?? "—"}</div>
                </div>
                <div>
                    <div className="text-muted-foreground">Fecha Factura</div>
                    <div className="font-medium">{fmtDate(purchase.invoice_date) ?? "—"}</div>
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