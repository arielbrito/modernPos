import { useCallback, useMemo, useState } from 'react';

type Denomination = { id: number; value: number; kind: 'bill' | 'coin'; currency_code: string };

// Props que el hook necesita para funcionar
interface UseCashCountProps {
    denominations: Denomination[];
    initialCurrency: string;
}

export function useCashCount({ denominations, initialCurrency }: UseCashCountProps) {
    const [qty, setQty] = useState<Record<number, number>>({});
    const [note, setNote] = useState('');
    const [hideZeros, setHideZeros] = useState(false);

    // Agrupación de denominaciones (lógica movida aquí)
    const groups = useMemo(() => {
        const by: Record<string, Denomination[]> = {};
        denominations.forEach((d) => (by[d.currency_code] ??= []).push(d));
        Object.values(by).forEach((list) => list.sort((a, b) => b.value - a.value));
        return by;
    }, [denominations]);

    const currencies = useMemo(() => Object.keys(groups), [groups]);
    const [activeTab, setActiveTab] = useState(initialCurrency);

    // Cálculo de totales (lógica movida aquí)
    const totals = useMemo(() => {
        const t: Record<string, number> = {};
        for (const [ccy, list] of Object.entries(groups)) {
            t[ccy] = list.reduce((sum, d) => sum + (qty[d.id] || 0) * d.value, 0);
        }
        return t;
    }, [groups, qty]);

    const grandTotal = useMemo(() => Object.values(totals).reduce((sum, total) => sum + total, 0), [totals]);

    // Handlers
    const setQuantity = useCallback((denominationId: number, newQty: number) => {
        setQty((prev) => ({ ...prev, [denominationId]: Math.max(0, newQty) }));
    }, []);

    const clearAll = useCallback(() => setQty({}), []);

    const buildPayload = useCallback(() => {
        const payload: Record<string, { denomination_id: number; qty: number }[]> = {};
        Object.entries(groups).forEach(([ccy, list]) => {
            const lines = list.map((d) => ({ denomination_id: d.id, qty: Number(qty[d.id] || 0) })).filter((l) => l.qty > 0);
            if (lines.length) payload[ccy] = lines;
        });
        return { counts: payload, note: note.trim() };
    }, [groups, qty, note]);

    return {
        qty,
        note,
        setNote,
        hideZeros,
        setHideZeros,
        groups,
        currencies,
        activeTab,
        setActiveTab,
        totals,
        grandTotal,
        setQuantity,
        clearAll,
        buildPayload,
    };
}
