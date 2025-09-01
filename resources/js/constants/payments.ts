export const PAYMENT_METHODS = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit', label: 'Crédito' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
