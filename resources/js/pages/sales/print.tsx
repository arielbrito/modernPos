/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources/js/pages/sales/print.tsx
import React, { useEffect, useMemo } from "react";

export default function SalePrint({ sale }: { sale: any }) {
    useEffect(() => { setTimeout(() => window.print(), 300); }, []);

    const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    const fmt = (n: any) =>
        r2(Number(n || 0)).toLocaleString("es-DO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const methodLabel = (m?: string) => {
        switch ((m || "").toLowerCase()) {
            case "cash": return "EFECTIVO";
            case "card": return "TARJETA";
            case "transfer": return "TRANSFERENCIA";
            case "credit": return "CRÉDITO";
            default: return (m || "OTRO").toUpperCase();
        }
    };

    const saleCcy = sale?.currency_code ?? "DOP";
    const lines: any[] = Array.isArray(sale?.lines) ? sale.lines : [];
    const payments: any[] = Array.isArray(sale?.payments) ? sale.payments : [];

    const subtotal = Number(sale?.subtotal ?? 0);
    const taxTotal = Number(sale?.tax_total ?? 0);
    const discountTotal = Number(sale?.discount_total ?? 0);
    const grand = Number(sale?.total ?? 0);
    const qtyTotal = lines.reduce((s, l) => s + Number(l?.qty || 0), 0);
    const itemsCount = lines.length;

    const occurredAt = new Date(sale?.occurred_at ?? new Date());
    const occurredAtStr = occurredAt.toLocaleString("es-DO");

    const storeName = sale?.store?.name ?? "Tienda";
    const storeTaxId =
        sale?.store?.rnc ??
        sale?.store?.tax_id ??
        sale?.store?.rnc_number ??
        null;

    // ✅ Paréntesis para no mezclar ?? y ||
    const storeAddress =
        (sale?.store?.address ??
            [sale?.store?.address_line1, sale?.store?.address_line2]
                .filter(Boolean)
                .join(" ")) || null;

    const storePhone = sale?.store?.phone ?? sale?.store?.telephone ?? null;

    const billName = sale?.bill_to_name ?? "Consumidor Final";
    const billDocType = sale?.bill_to_doc_type ?? "NONE";
    const billDoc = sale?.bill_to_doc_number ?? null;
    const billIsTax = !!sale?.bill_to_is_taxpayer;

    const paymentMethodsText = useMemo(() => {
        const uniq = [...new Set(payments.map(p => methodLabel(p?.method)))];
        return uniq.length ? uniq.join(", ") : "—";
    }, [payments]);

    // ✅ Sin mezclar ?? con ||: usamos variables intermedias
    const cash = useMemo(() => {
        let amount = 0, tendered = 0, change = 0;
        let changeCcy = saleCcy;

        for (const p of payments) {
            if ((p?.method || "").toLowerCase() !== "cash") continue;

            amount += Number(p?.amount || 0);
            tendered += Number(p?.tendered_amount ?? p?.meta?.tendered_amount ?? 0);
            change += Number(p?.change_amount ?? p?.meta?.change_amount ?? 0);

            const prefChangeCcy =
                p?.change_currency_code ??
                p?.meta?.change_currency_code ??
                changeCcy;

            changeCcy = prefChangeCcy || changeCcy; // solo OR
        }

        return {
            amount: amount || null,
            tendered: tendered || null,
            change: change || null,
            changeCcy,
        };
    }, [payments, saleCcy]);

    const copyLabel = useMemo(() => {
        const qs = new URLSearchParams(window.location.search);
        const v = (qs.get("copy") || "").toLowerCase();
        if (v === "merchant" || v === "comercio") return "COPIA COMERCIO";
        return "COPIA CLIENTE";
    }, []);

    const Style = () => (
        <style>{`
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      .tnum { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
      .pill {
        border: 1px solid #CBD5E1; border-radius: 9999px; padding: 2px 8px;
        font-size: 10px; color: #0f172a;
      }
    `}</style>
    );

    return (
        <div className="w-[80mm] mx-auto text-[12px] font-sans text-slate-900 print:w-[80mm] dark:print:text-slate-200">
            <Style />

            <div className="text-center mb-2">
                <div className="font-extrabold text-[14px]">{storeName}</div>
                {storeTaxId && (
                    <div className="text-[10px] leading-tight">RNC: {storeTaxId}</div>
                )}
                {storeAddress && (
                    <div className="text-[10px] leading-tight">{storeAddress}</div>
                )}
                {storePhone && (
                    <div className="text-[10px] leading-tight">Tel.: {storePhone}</div>
                )}

                <div className="mt-1 text-[10px]">
                    {sale?.ncf_number ? (
                        <>NCF: {sale.ncf_number} · Tipo: {sale?.ncf_type ?? "—"}</>
                    ) : (
                        <span className="opacity-70">NCF no emitido</span>
                    )}
                </div>
                <div className="text-[10px]">No. {sale?.number ?? "—"}</div>

                <div className="mt-1 inline-block pill">{copyLabel}</div>
            </div>

            <div className="border border-slate-300 rounded-md p-2 text-[11px] mb-2">
                <div><span className="font-semibold">Cliente:</span> {billName}</div>
                <div className="flex justify-between">
                    <span>
                        Identificación: {billDoc ? `${billDocType} ${billDoc}` : "—"}
                    </span>
                    {billIsTax ? <span>· Contribuyente</span> : null}
                </div>
            </div>

            <div className="grid grid-cols-2 text-[11px] mb-2">
                <div className="space-y-0.5">
                    <div><span className="text-slate-500 dark:text-slate-100">Fecha</span></div>
                    <div><span className="text-slate-500 dark:text-slate-100">Método de pago</span></div>
                    <div><span className="text-slate-500 dark:text-slate-100">Vendedor</span></div>
                    <div><span className="text-slate-500 dark:text-slate-100">No.</span></div>
                </div>
                <div className="text-right space-y-0.5">
                    <div>{occurredAtStr}</div>
                    <div>{paymentMethodsText}</div>
                    <div>{sale?.user?.name ?? "—"}</div>
                    <div>{sale?.number ?? "—"}</div>
                </div>
            </div>

            <div className="border-t border-b py-1 my-2">
                {lines.map((l, idx) => (
                    <div key={idx} className="mb-1">
                        <div className="flex justify-between">
                            <div className="w-2/3 pr-1">{l?.name ?? `Ítem #${idx + 1}`}</div>
                            <div className="w-1/3 text-right tnum">{fmt(l?.line_total)}</div>
                        </div>
                        <div className="text-[10px] text-slate-500">
                            {fmt(l?.qty)} × {fmt(l?.unit_price)}
                            {Number(l?.tax_amount || 0) > 0 && <> · ITBIS: {fmt(l?.tax_amount)}</>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-1 text-[12px]">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tnum">{fmt(subtotal)}</span>
                </div>
                {taxTotal > 0 && (
                    <div className="flex justify-between">
                        <span>ITBIS</span>
                        <span className="tnum">{fmt(taxTotal)}</span>
                    </div>
                )}
                {discountTotal > 0 && (
                    <div className="flex justify-between">
                        <span>Descuento</span>
                        <span className="tnum">-{fmt(discountTotal)}</span>
                    </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                    <span>TOTAL</span>
                    <span className="tnum">{fmt(grand)} {saleCcy}</span>
                </div>
            </div>

            <div className="mt-2">
                {payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-[12px]">
                        <span>{methodLabel(p?.method)}</span>
                        <span className="tnum">{fmt(p?.amount)} {p?.currency_code ?? saleCcy}</span>
                    </div>
                ))}
                {cash.tendered != null && (
                    <div className="flex justify-between text-[12px]">
                        <span>Recibido</span>
                        <span className="tnum">{fmt(cash.tendered)} {saleCcy}</span>
                    </div>
                )}
                {cash.change != null && Number(cash.change) > 0 && (
                    <div className="flex justify-between text-[12px]">
                        <span>Cambio</span>
                        <span className="tnum">{fmt(cash.change)} {cash.changeCcy}</span>
                    </div>
                )}
            </div>

            <div className="mt-3 text-[10px] text-center text-slate-600 dark:text-slate-100">
                <div>
                    Total de ítems: {itemsCount} · Cantidad total: {fmt(qtyTotal)}
                </div>
                <div className="mt-2">¡Gracias por su compra!</div>
            </div>
        </div>
    );
}
