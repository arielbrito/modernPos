import * as React from "react";
import { Link } from "@inertiajs/react";
import { TableRow, TableCell } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import { money, toNum } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchase: Purchase & { returns_total: number | null; true_balance: number };
    actions: ReturnType<typeof usePurchaseActions>;
}

export const PurchaseRow = React.memo(({ purchase, actions }: Props) => {
    const isApproving = actions.loadingStates.approving === purchase.id;
    const isCancelling = actions.loadingStates.cancelling === purchase.id;
    const isLoading = isApproving || isCancelling;

    const supplierName = purchase.supplier?.name ?? "N/A";
    const invoiceNumber = purchase.invoice_number ?? "N/A";
    const invoiceDate = purchase.invoice_date ? fmtDate(purchase.invoice_date) : "Sin fecha";

    const grandTotal = toNum(purchase.grand_total);
    const returnsTotal = toNum(purchase.returns_total ?? 0);
    const trueBalance = toNum(purchase.true_balance);

    return (
        <TableRow
            className={`transition-opacity ${isLoading ? "opacity-60" : "opacity-100"}`}
            aria-busy={isLoading}
        >
            <TableCell>
                <Link
                    href={PurchaseController.show.url({ purchase: purchase.id })}
                    className="font-mono text-sm font-medium text-primary hover:underline"
                >
                    {purchase.code}
                </Link>
            </TableCell>

            <TableCell className="truncate">{supplierName}</TableCell>

            <TableCell>
                <StatusBadge status={purchase.status} />
            </TableCell>

            {/* Factura / Fecha (dos líneas) */}
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{invoiceNumber}</span>
                    <span className="text-xs text-muted-foreground">{invoiceDate}</span>
                </div>
            </TableCell>

            <TableCell className="text-right font-mono">{money(grandTotal)}</TableCell>

            <TableCell className="text-right font-mono">
                {returnsTotal > 0 ? (
                    <span className="text-amber-600">- {money(returnsTotal)}</span>
                ) : (
                    "—"
                )}
            </TableCell>

            <TableCell
                className={`text-right font-mono font-bold ${trueBalance > 0 ? "text-destructive" : "text-green-600"
                    }`}
            >
                {money(trueBalance)}
            </TableCell>

            <TableCell className="text-right">
                <ActionMenu purchase={purchase} actions={actions} />
            </TableCell>
        </TableRow>
    );
});
