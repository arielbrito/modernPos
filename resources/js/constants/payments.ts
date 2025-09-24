import { Banknote, Check, CreditCard, Landmark } from 'lucide-react';
import * as React from 'react';

// 'as const' es clave para que TypeScript infiera los tipos de forma estricta.
export const PAYMENT_METHODS = [
    { value: 'cash', label: 'Efectivo', icon: React.createElement(Banknote, { className: 'h-4 w-4' }) },
    { value: 'transfer', label: 'Transferencia', icon: React.createElement(Landmark, { className: 'h-4 w-4' }) },
    { value: 'card', label: 'Tarjeta', icon: React.createElement(CreditCard, { className: 'h-4 w-4' }) },
    { value: 'cheque', label: 'Cheque', icon: React.createElement(Check, { className: 'h-4 w-4' }) },
] as const;

// Creamos un tipo dinámicamente a partir de la constante para usarlo en toda la app.
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];
