export const CURRENCY = [
    { value: 'DOP', label: 'DOP' },
    { value: 'USD', label: 'USD' },
    { value: 'EURO', label: 'EURO' },
] as const;

export type PaymentMethod = (typeof CURRENCY)[number]['value'];
