import * as React from "react";
import { CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";

type Props = { purchase: Purchase; returnsTotal?: number | string | null; };

const Row = ({
    label, value, className, strong = false, prefix,
}: { label: string; value: number; className?: string; strong?: boolean; prefix?: string; }) => {
    const content = (
        <div className={`flex items-baseline justify-between ${className ?? ""}`}>
            <span>{label}</span>
            <span className={strong ? "font-semibold" : ""}>
                {prefix ? `${prefix} ` : ""}{money(value)}
            </span>
        </div>
    );
    return strong ? <div className="text-base">{content}</div> : content;
};

export function FinancialSummaryCard({ purchase, returnsTotal = 0 }: Props) {
    const values = React.useMemo(() => ({
        subtotal: toNum(purchase.subtotal),
        discount_total: toNum(purchase.discount_total),
        tax_total: toNum(purchase.tax_total),
        freight: toNum(purchase.freight),
        other_costs: toNum(purchase.other_costs),
        grand_total: toNum(purchase.grand_total),
        paid_total: toNum(purchase.paid_total),
        balance_total: toNum(purchase.balance_total),
    }), [purchase]);

    const returns = toNum(returnsTotal);
    const hasExtras = values.freight + values.other_costs > 0;
    const hasDiscount = values.discount_total > 0;
    const hasTax = values.tax_total > 0;
    const hasReturns = returns > 0;

    const net_total = hasReturns ? Math.max(0, values.grand_total - returns) : values.grand_total;
    const net_balance = hasReturns ? Math.max(0, values.balance_total - returns) : values.balance_total;

    return (
        <section className="pos-card">
            <div className="px-4 py-3 border-b flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-base font-semibold">Resumen Financiero</h2>
            </div>

            <CardContent className="space-y-3 text-sm p-4">
                <Row label="Subtotal" value={values.subtotal} />

                {hasDiscount && (
                    <Row label="Descuentos" value={values.discount_total} className="text-green-600" prefix="-" />
                )}

                {hasTax && <Row label="Impuestos" value={values.tax_total} />}

                {hasExtras && (
                    <Row label="Flete y Otros" value={values.freight + values.other_costs} />
                )}

                <div className="my-2 h-px bg-border" />

                <Row label="Total General" value={values.grand_total} strong />

                {hasReturns && (
                    <>
                        <Row label="Devoluciones aplicadas" value={returns} className="text-amber-600" prefix="-" />
                        <Row label="Total Neto (tras devoluciones)" value={net_total} strong />
                    </>
                )}

                {values.paid_total > 0 && (
                    <Row label="Pagado" value={values.paid_total} className="text-green-600" />
                )}

                <Row
                    label={hasReturns ? "Balance Neto Pendiente" : "Balance Pendiente"}
                    value={hasReturns ? net_balance : values.balance_total}
                    strong
                    className={(hasReturns ? net_balance : values.balance_total) > 0 ? "text-destructive" : "text-green-600"}
                />
            </CardContent>
        </section>
    );
}
