import { useMemo } from 'react';
// --- 1. Importaciones Corregidas ---
import type { CountDetailData, PaymentRow, Report } from '../types/shift-types';

interface SummaryByCurrencyItem {
    currency_code: string;
    opening: number;
    income: number;
    expense: number;
    change: number;
    expected: number;
    counted: number;
    variance: number;
    change_out: number;
    estimated: number;
}

// --- 2. Definimos explícitamente la "forma" de lo que devuelve el hook ---
interface UseShiftReportDataResult {
    shift: Report['shift'] | undefined;
    summaryByCurrencyArray: SummaryByCurrencyItem[];
    openingCountDetails: CountDetailData | null;
    closingCountDetails: CountDetailData | null;
    paymentRows: PaymentRow[];
    salesCount: number;
    totals: Report['summary']['totals'];
}

/**
 * Hook para procesar los datos crudos del reporte de cierre de turno
 * y devolverlos en un formato optimizado para la UI.
 */
export function useShiftReportData(report: Report | null): UseShiftReportDataResult {
    const { summary, counts, payments, sales, shift } = report || {};

    const summaryByCurrencyArray: SummaryByCurrencyItem[] = useMemo(() => {
        if (!summary?.by_currency) return [];
        return Object.entries(summary.by_currency).map(([currency_code, data]) => ({
            currency_code,
            change_out: 0,
            estimated: 0,
            ...data,
        }));
    }, [summary]);

    const openingCountDetails: CountDetailData | null = useMemo(() => {
        if (!counts?.opening) return null;
        return counts.opening;
    }, [counts]);

    const closingCountDetails: CountDetailData | null = useMemo(() => {
        if (!counts?.closing) return null;
        return counts.closing;
    }, [counts]);

    const totals = useMemo(() => {
        return summary?.totals ?? { expected: 0, counted: 0, variance: 0, opening: 0, income: 0, expense: 0, change: 0 };
    }, [summary]);

    return {
        shift,
        summaryByCurrencyArray,
        openingCountDetails,
        closingCountDetails,
        paymentRows: payments?.rows ?? [],
        salesCount: sales?.count ?? 0,
        totals,
    };
}
