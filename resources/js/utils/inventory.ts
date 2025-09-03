/* eslint-disable @typescript-eslint/no-explicit-any */
export type NumberLike = number | string | undefined | null;

export function toNum(n: NumberLike): number {
    if (n === undefined || n === null || n === '') return 0;
    const s = typeof n === 'string' ? n.replace(/,/g, '.') : String(n);
    const v = Number(s);
    return isNaN(v) ? 0 : v;
}

export interface PurchaseLine {
    product_variant_id: number | null; // <-- AÑADE ESTA LÍNEA
    qty_ordered: number | string;
    unit_cost: number | string;
    discount_pct?: number | string;
    tax_pct?: number | string;
    [key: string]: any; // Permite otras propiedades
}

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

export function purchaseTotals(items: PurchaseLine[], freight: number | string = 0, other_costs: number | string = 0) {
    const calculatedItems = items.map((item) => {
        const qty = toNum(item.qty_ordered);
        const cost = toNum(item.unit_cost);
        const discountPct = toNum(item.discount_pct);
        const taxPct = toNum(item.tax_pct);

        const base = qty * cost;
        const discountAmount = base * (discountPct / 100);
        const taxableBase = base - discountAmount;
        const taxAmount = taxableBase * (taxPct / 100);
        const line_total = taxableBase + taxAmount;

        return { ...item, line_total, discount_amount: discountAmount, tax_amount: taxAmount };
    });

    const subtotal = calculatedItems.reduce((acc, item) => acc + toNum(item.qty_ordered) * toNum(item.unit_cost), 0);
    const discount_total = calculatedItems.reduce((acc, item) => acc + item.discount_amount, 0);
    const tax_total = calculatedItems.reduce((acc, item) => acc + item.tax_amount, 0);

    const grand_total = subtotal - discount_total + tax_total + toNum(freight) + toNum(other_costs);

    return {
        calculatedItems, // El nuevo array con los totales de línea
        subtotal,
        discount_total,
        tax_total,
        grand_total,
    };
}

export function money(v: NumberLike, min = 2, max = 2) {
    return toNum(v).toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max });
}
