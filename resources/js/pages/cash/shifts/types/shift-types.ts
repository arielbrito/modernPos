// --- TIPOS BASE ---

// Describe una denominación de moneda
export interface Denomination {
    id: number;
    value: number;
    kind: 'bill' | 'coin';
    currency_code: string;
}

// Describe una línea de conteo con billetes/monedas
export interface CountLine {
    denomination: number;
    kind: 'bill' | 'coin';
    qty: number;
    subtotal: number;
}

// Describe el desglose de un conteo (apertura o cierre)
export interface CountData {
    lines: CountLine[];
    total: number;
}

// Describe un resumen financiero (puede ser total o por moneda)
export interface SummaryData {
    opening: number;
    income: number;
    expense: number;
    change: number;
    expected: number;
    counted: number;
    variance: number;
}

// --- TIPOS PARA EL REPORTE DE CIERRE ---

// Describe una fila en la tabla de pagos del reporte
export interface PaymentRow {
    method: string;
    currency_code: string;
    count: number;
    amount: number; // Es mejor usar `number` y formatear en la UI
    amount_in_sale_ccy: number;
}

// Describe el objeto principal del reporte que viene del backend
export interface Report {
    shift: {
        id: number;
        status: 'open' | 'closed';
        opened_at: string;
        closed_at?: string | null;
        register: { id: number; name: string };
        store: { id: number; code: string; name: string };
    };
    sales: {
        count: number;
        totals_by_currency: Array<{
            currency_code: string;
            count: number;
            total: number;
        }>;
    };
    payments: {
        rows: PaymentRow[];
        cash_in: number;
        cash_change_out: number;
    };
    summary: {
        by_currency: Record<string, SummaryData>;
        totals: SummaryData;
    };
    counts: {
        opening: {
            by_currency: Record<string, CountData>;
            totals: number;
        };
        closing: {
            by_currency: Record<string, CountData>;
            totals: number;
        };
    };
    cash_movements: Array<{
        currency_code: string;
        cash_in: number;
        cash_out: number;
        net: number;
    }> | null;
}

// --- TIPOS DERIVADOS PARA USAR EN EL FRONTEND ---

// Extiende SummaryData para añadir el código de moneda, usado en la tabla de resumen
export interface SummaryByCurrencyItem extends SummaryData {
    currency_code: string;
}
