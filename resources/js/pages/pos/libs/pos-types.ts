/* eslint-disable @typescript-eslint/no-explicit-any */

import { Customer } from '@/types/index';

// Tipos del Carrito
export type CartItem = {
    product_variant_id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
};

export type LineMeta = {
    discount_percent?: number | null;
    discount_amount?: number | null;
    tax_code?: string | null;
    tax_name?: string | null;
    tax_rate?: number | null;
};

// Tipos para Totales
export type LineTotals = {
    lineBase: number;
    discount: number;
    totalExTax: number;
    taxAmount: number;
    lineTotal: number;
};

export type CartTotals = {
    subtotal: number;
    discount_total: number;
    tax_total: number;
    total: number;
};

// Tipos para el Payload de la Venta
export type SaleLinePayload = {
    variant_id: number;
    qty: number;
    unit_price: number;
} & Partial<LineMeta>;

export type SalePaymentPayload = {
    method: string;
    amount: number;
    currency_code: string;
    fx_rate_to_sale: number | null | undefined;
    reference?: string | null;
    tendered_amount?: number | null;
    change_amount?: number | null;
    change_currency_code?: string | null;
};

export type SalePayload = {
    store_id: number;
    register_id: number;
    shift_id: number;
    customer_id: number | null;
    bill_to_name: string;
    bill_to_doc_type: 'RNC' | 'CED' | 'NONE';
    bill_to_doc_number: string | null;
    bill_to_is_taxpayer: boolean;
    currency_code: string;
    ncf_type: 'B01' | 'B02';
    occurred_at: string;
    lines: SaleLinePayload[];
    payments: SalePaymentPayload[];
    meta: { buyer: any };
};

// Contexto del POS
export interface PosContext {
    storeId: number | null;
    registerId: number | null;
    shiftId: number | null;
    store: { id: number; code: string; name: string } | null;
}

// Cliente del POS
export type PosCustomer = Customer | null;
