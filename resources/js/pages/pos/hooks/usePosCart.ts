/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from '@/types';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
    const addToCart = useCallback(
        (product: Product) => {
            const variant = (product as any)?.variants?.[0];
            if (!variant) return;

            // --- Lógica de Stock (si aplica) ---
            if (product.product_nature === 'stockable') {
                const stock = variant.stock ?? 0;
                const itemInCart = items.find((i) => i.product_variant_id === variant.id);
                const quantityInCart = itemInCart?.quantity ?? 0;

                if (quantityInCart >= stock) {
                    toast.error('Producto Agotado', { description: `No hay más unidades de "${product.name}".` });
                    return;
                }

                if (stock > 0 && stock <= 5 && quantityInCart === stock - 1) {
                    toast.warning('Última unidad en stock', { description: `Añadiste la última unidad de "${product.name}".` });
                }
            }

            // --- Lógica para añadir/actualizar el item en el carrito ---
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

            // --- Lógica para establecer los impuestos por defecto (solo si el item es nuevo) ---
            setLineMeta((prev) => {
                if (prev[variant.id]) return prev; // No sobreescribir si ya existe

                const defaultTaxable = TAX_OPTIONS.find((t) => t.code === 'ITBIS18') || TAX_OPTIONS[0];
                const defaultExempt = TAX_OPTIONS.find((t) => t.code === 'EXENTO') || TAX_OPTIONS[1];

                if (!variant.is_taxable) {
                    return {
                        ...prev,
                        [variant.id]: {
                            tax_code: defaultExempt.code,
                            tax_name: defaultExempt.name,
                            tax_rate: defaultExempt.rate,
                        },
                    };
                }

                const taxInfo = TAX_OPTIONS.find((t) => t.code === variant.tax_code);
                return {
                    ...prev,
                    [variant.id]: {
                        tax_code: variant.tax_code || defaultTaxable.code,
                        tax_name: taxInfo?.name || defaultTaxable.name,
                        tax_rate: variant.tax_rate ?? defaultTaxable.rate,
                        discount_amount: null,
                        discount_percent: null,
                    },
                };
            });
        },
        [items],
    );

    /**
     * Actualiza la cantidad de un producto en el carrito.
     * Si la cantidad es 0 o menos, elimina el producto.
     */
    const updateQuantity = useCallback(
        (variantId: number, newQuantity: number) => {
            if (newQuantity <= 0) {
                // Primero, removemos el item del carrito
                setItems((prev) => prev.filter((i) => i.product_variant_id !== variantId));
                // Luego, removemos sus metadatos
                setLineMeta((prev) => {
                    const next = { ...prev };
                    delete next[variantId];
                    return next;
                });
            } else {
                // Si solo actualizamos la cantidad, solo se llama a `setItems`
                setItems((prev) => prev.map((i) => (i.product_variant_id === variantId ? { ...i, quantity: newQuantity } : i)));
            }
        },
        [setItems, setLineMeta],
    ); // useCallback optimiza la función

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
