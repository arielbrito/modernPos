/* eslint-disable @typescript-eslint/no-explicit-any */
// /resources/js/pages/POS/lib/pos-helpers.ts

import type { CartItem, CartTotals, LineMeta, LineTotals } from './pos-types';

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const f2 = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};
export const isTruthy = (v: unknown) => {
    return v === true || v === 1 || v === '1' || v === 'true' || v === 'TRUE' || v === 'S' || v === 'Y';
};
export const onlyDigits = (s?: string | null) => (s ?? '').replace(/\D+/g, '');

export function formatTime(date: Date): string {
    return (
        date.toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' +
        date.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
}

export function calcLine(qty: number, unitPrice: number, meta?: LineMeta): LineTotals {
    const base = r2(qty * unitPrice);
    let discAmt = r2(meta?.discount_amount ?? 0);
    const discPct = meta?.discount_percent ?? 0;

    if (discPct > 0 && (!meta?.discount_amount || meta.discount_amount === 0)) {
        discAmt = r2(base * (discPct / 100));
    }
    const ex = Math.max(0, r2(base - discAmt));
    const rate = meta?.tax_rate ?? 0;
    const tax = r2(ex * rate);
    const total = r2(ex + tax);
    return { lineBase: base, discount: discAmt, totalExTax: ex, taxAmount: tax, lineTotal: total };
}

export function calcCartTotals(cartItems: CartItem[], lineMeta: Record<number, LineMeta>): CartTotals {
    let subtotal = 0,
        discount_total = 0,
        tax_total = 0,
        total = 0;
    for (const ci of cartItems) {
        const m = lineMeta[ci.product_variant_id];
        const t = calcLine(ci.quantity, ci.price, m);
        subtotal += t.lineBase;
        discount_total += t.discount;
        tax_total += t.taxAmount;
        total += t.lineTotal;
    }
    return { subtotal: r2(subtotal), discount_total: r2(discount_total), tax_total: r2(tax_total), total: r2(total) };
}

export function compactLineMeta(m?: LineMeta): Partial<LineMeta> {
    if (!m) return {};
    const out: any = {};
    if (m.discount_percent && m.discount_percent > 0) out.discount_percent = r2(m.discount_percent);
    if (m.discount_amount && m.discount_amount > 0) out.discount_amount = r2(m.discount_amount);
    if (m.tax_code) out.tax_code = m.tax_code;
    if (m.tax_name) out.tax_name = m.tax_name;
    if (typeof m.tax_rate === 'number') out.tax_rate = +Number(m.tax_rate).toFixed(4);
    return out;
}
