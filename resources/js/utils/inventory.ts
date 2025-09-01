export type NumberLike = number | string | undefined | null;

export function toNum(n: NumberLike): number {
    if (n === undefined || n === null || n === '') return 0;
    const s = typeof n === 'string' ? n.replace(/,/g, '.') : String(n);
    const v = Number(s);
    return isNaN(v) ? 0 : v;
}

export type PurchaseLine = {
    qty_ordered: NumberLike;
    unit_cost: NumberLike;
    discount_pct?: NumberLike;
    discount_amount?: NumberLike; // opcional si calculas por pct
    tax_pct?: NumberLike;
};

export function lineCalc(row: PurchaseLine) {
    const qty = Math.max(0, toNum(row.qty_ordered));
    const unit = Math.max(0, toNum(row.unit_cost));
    const base = qty * unit;

    const discPct = Math.max(0, toNum(row.discount_pct));
    const discAmount =
        row.discount_amount !== undefined && row.discount_amount !== null && row.discount_amount !== ''
            ? Math.max(0, toNum(row.discount_amount))
            : base * (discPct / 100);

    const taxPct = Math.max(0, toNum(row.tax_pct));
    const taxAmount = Math.max(0, (base - discAmount) * (taxPct / 100));

    const total = base - discAmount + taxAmount; // landed cost se prorratea en backend
    return { base, discAmount, taxAmount, total };
}

export function purchaseTotals(items: PurchaseLine[], freight: NumberLike = 0, otherCosts: NumberLike = 0) {
    const acc = items.reduce(
        (a, it) => {
            const { base, discAmount, taxAmount, total } = lineCalc(it);
            a.subtotal += base;
            a.discount_total += discAmount;
            a.tax_total += taxAmount;
            a.line_total += total;
            return a;
        },
        { subtotal: 0, discount_total: 0, tax_total: 0, line_total: 0 },
    );
    const grand_total = acc.subtotal - acc.discount_total + acc.tax_total + toNum(freight) + toNum(otherCosts);
    return { ...acc, grand_total };
}

export function money(v: NumberLike, min = 2, max = 2) {
    return toNum(v).toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max });
}
