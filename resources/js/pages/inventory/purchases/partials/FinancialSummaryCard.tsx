import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";

type Props = {
    purchase: Purchase;
    /** Monto total devuelto asociado a la compra (si quieres reflejarlo aquí) */
    returnsTotal?: number | string | null;
    /** Permite ocultar/mostrar el bloque de devoluciones dentro del resumen */
    showReturns?: boolean;
};

const Row = ({
    label,
    value,
    className,
    strong = false,
    prefix,
}: {
    label: string;
    value: number;
    className?: string;
    strong?: boolean;
    prefix?: string; // p.ej. "-" para descuentos o devoluciones
}) => {
    const content = (
        <div className={`flex items-baseline justify-between ${className ?? ""}`}>
            <span>{label}</span>
            <span className={strong ? "font-semibold" : ""}>
                {prefix ? `${prefix} ` : ""}
                {money(value)}
            </span>
        </div>
    );
    return strong ? <div className="text-base">{content}</div> : content;
};

export function FinancialSummaryCard({
    purchase,
    returnsTotal = 0,
    showReturns = true,
}: Props) {
    const {
        subtotal,
        discount_total,
        tax_total,
        freight,
        other_costs,
        grand_total,
        paid_total,
        balance_total,
    } = React.useMemo(() => {
        return {
            subtotal: toNum(purchase.subtotal),
            discount_total: toNum(purchase.discount_total),
            tax_total: toNum(purchase.tax_total),
            freight: toNum(purchase.freight),
            other_costs: toNum(purchase.other_costs),
            grand_total: toNum(purchase.grand_total),
            paid_total: toNum(purchase.paid_total),
            balance_total: toNum(purchase.balance_total),
        };
    }, [purchase]);

    const returns = toNum(returnsTotal);
    const hasExtras = freight + other_costs > 0;
    const hasDiscount = discount_total > 0;
    const hasTax = tax_total > 0;
    const hasReturns = showReturns && returns > 0;

    // Totales “netos” considerando devoluciones (si decides mostrarlas aquí)
    const net_total = hasReturns ? Math.max(0, grand_total - returns) : grand_total;
    const net_balance = hasReturns ? Math.max(0, balance_total - returns) : balance_total;

    const balanceClass =
        (hasReturns ? net_balance : balance_total) > 0
            ? "text-destructive"
            : "text-green-600";

    return (
        <Card aria-label="Resumen financiero de la compra">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Resumen Financiero
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
                <Row label="Subtotal" value={subtotal} />

                {hasDiscount && (
                    <Row
                        label="Descuentos"
                        value={discount_total}
                        className="text-green-600"
                        prefix="-"
                    />
                )}

                {hasTax && <Row label="Impuestos" value={tax_total} />}

                {hasExtras && (
                    <Row label="Flete y Otros" value={freight + other_costs} />
                )}

                <Separator />

                <Row label="Total General" value={grand_total} strong />

                {hasReturns && (
                    <>
                        <Row
                            label="Devoluciones aplicadas"
                            value={returns}
                            className="text-amber-600"
                            prefix="-"
                        />
                        <Row label="Total Neto (tras devoluciones)" value={net_total} strong />
                    </>
                )}

                {paid_total > 0 && (
                    <Row label="Pagado" value={paid_total} className="text-green-600" />
                )}

                <Row
                    label={hasReturns ? "Balance Neto Pendiente" : "Balance Pendiente"}
                    value={hasReturns ? net_balance : balance_total}
                    strong
                    className={balanceClass}
                />
            </CardContent>
        </Card>
    );
}
