import * as React from "react";
import { Link } from "@inertiajs/react";
import { TableRow, TableCell } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { ActionMenu } from "./ActionMenu";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchase: Purchase & { returns_total: number | null, true_balance: number };
    actions: ReturnType<typeof usePurchaseActions>;
}

export const PurchaseRow = React.memo(({ purchase, actions }: Props) => {
    const isLoading = actions.loadingStates.approving === purchase.id || actions.loadingStates.cancelling === purchase.id;

    return (
        <TableRow className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
            <TableCell>
                <Link href={PurchaseController.show.url({ purchase: purchase.id })} className="font-mono text-sm font-medium text-primary hover:underline">
                    {purchase.code}
                </Link>
            </TableCell>
            <TableCell>{purchase.supplier?.name || "N/A"}</TableCell>
            <TableCell><StatusBadge status={purchase.status} /></TableCell>
            <TableCell>{fmtDate(purchase.invoice_date)}</TableCell>
            <TableCell className="text-right font-mono">{money(purchase.grand_total)}</TableCell>
            <TableCell className="text-right font-mono text-yellow-600">
                {purchase.returns_total && purchase.returns_total > 0 ? `- ${money(purchase.returns_total)}` : '—'}
            </TableCell>
            <TableCell className={`text-right font-mono font-bold ${purchase.true_balance > 0 ? 'text-destructive' : ''}`}>
                {money(purchase.true_balance)}
            </TableCell>
            <TableCell className="text-right">
                <ActionMenu purchase={purchase} actions={actions} />
            </TableCell>
        </TableRow>
    );
});