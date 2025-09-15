/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from '@/types';
import { useMemo, useState } from 'react';
import { TAX_OPTIONS } from '../libs/pos-constants';
import { calcCartTotals } from '../libs/pos-helpers';
import type { CartItem, CartTotals, LineMeta } from '../libs/pos-types';

export interface UsePosCartResult {
    items: CartItem[];
    lineMeta: Record<number, LineMeta>;
    totals: CartTotals;
    itemCount: number;
    totalQuantity: number;
    addToCart: (product: Product) => void;
    updateQuantity: (variantId: number, newQuantity: number) => void;
    updateLineMeta: (variantId: number, patch: Partial<LineMeta>) => void;
    clearCart: () => void;
}

/**
 * Hook para gestionar el estado y la lógica del carrito de compras del TPV.
 */
export function usePosCart(): UsePosCartResult {
    const [items, setItems] = useState<CartItem[]>([]);
    const [lineMeta, setLineMeta] = useState<Record<number, LineMeta>>({});

    // Memoizamos los totales para que solo se recalculen cuando el carrito cambie.
    const totals: CartTotals = useMemo(() => calcCartTotals(items, lineMeta), [items, lineMeta]);
    const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    /**
     * Añade un producto al carrito. Si ya existe, incrementa su cantidad.
     */
    const addToCart = (product: Product) => {
        const variant = (product as any)?.variants?.[0];
        if (!variant) return;

        setItems((prev) => {
            const existing = prev.find((i) => i.product_variant_id === variant.id);
            if (existing) {
                return prev.map((i) => (i.product_variant_id === variant.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [
                ...prev,
                {
                    product_variant_id: variant.id,
                    name: product.name,
                    sku: variant.sku,
                    quantity: 1,
                    price: Number(variant.selling_price) || 0,
                },
            ];
        });

        // Inicializa los metadatos de la línea (impuestos) si no existen
        setLineMeta((prev) => {
            if (prev[variant.id]) return prev; // No sobreescribir si ya existe

            const taxOption =
                (variant.is_taxable && TAX_OPTIONS.find((t) => t.code === variant.tax_code)) ||
                (variant.is_taxable ? TAX_OPTIONS[0] : TAX_OPTIONS[1]);

            return {
                ...prev,
                [variant.id]: {
                    tax_code: taxOption.code,
                    tax_name: taxOption.name,
                    tax_rate: taxOption.rate,
                },
            };
        });
    };

    /**
     * Actualiza la cantidad de un producto en el carrito.
     * Si la cantidad es 0 o menos, elimina el producto.
     */
    const updateQuantity = (variantId: number, newQuantity: number) => {
        setItems((prev) => {
            if (newQuantity <= 0) {
                // Limpia los metadatos de la línea al eliminar el producto
                setLineMeta((metaPrev) => {
                    const next = { ...metaPrev };
                    delete next[variantId];
                    return next;
                });
                return prev.filter((i) => i.product_variant_id !== variantId);
            }
            return prev.map((i) => (i.product_variant_id === variantId ? { ...i, quantity: newQuantity } : i));
        });
    };

    /**
     * Actualiza los metadatos (descuentos, impuestos) de una línea del carrito.
     */
    const updateLineMeta = (variantId: number, patch: Partial<LineMeta>) => {
        setLineMeta((prev) => {
            const current = prev[variantId] ?? {};
            const next: LineMeta = { ...current, ...patch };

            // Lógica de negocio: si se aplica un descuento por monto, se anula el de porcentaje y viceversa.
            if (patch.discount_amount != null && patch.discount_amount > 0) {
                next.discount_percent = null;
            } else if (patch.discount_percent != null && patch.discount_percent > 0) {
                next.discount_amount = null;
            }

            return { ...prev, [variantId]: next };
        });
    };

    /**
     * Vacía el carrito por completo.
     */
    const clearCart = () => {
        setItems([]);
        setLineMeta({});
    };

    return {
        items,
        lineMeta,
        totals,
        itemCount: items.length,
        totalQuantity,
        addToCart,
        updateQuantity,
        updateLineMeta,
        clearCart,
    };
}
