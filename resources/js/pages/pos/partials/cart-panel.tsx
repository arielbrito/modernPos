/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShoppingCart, Plus, Minus, X, MoreVertical, DollarSign, Pause } from 'lucide-react';
import type { CartItem, LineMeta, CartTotals } from '../libs/pos-types';
import { f2 } from '../libs/pos-helpers';
import { LineEditor } from './line-editor';
import { Separator } from '@/components/ui/separator';

interface CartPanelProps {
    items: CartItem[];
    totals: CartTotals;
    lineMeta: Record<number, LineMeta>;
    onUpdateQuantity: (variantId: number, newQuantity: number) => void;
    onUpdateLineMeta: (variantId: number, patch: Partial<LineMeta>) => void;
    onClearCart: () => void;
    onCheckout: () => void;
    onHold: () => void;
    isProcessing: boolean;
}

const EmptyCart = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShoppingCart className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Carrito Vacío
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
            Agrega productos para comenzar una venta.
        </p>
    </div>
);

const CartItemCard = ({ item, lineMeta, onUpdateQuantity, onUpdateLineMeta }: {
    item: CartItem;
    lineMeta: LineMeta | undefined;
    onUpdateQuantity: (id: number, qty: number) => void;
    onUpdateLineMeta: (id: number, patch: Partial<LineMeta>) => void;
}) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white text-sm leading-tight pr-2" title={item.name}>
                    {item.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    ${f2(item.price)} c/u
                </p>
            </div>
            <div className="flex items-center">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="p-3">
                        <LineEditor
                            meta={lineMeta}
                            onChange={(patch) => onUpdateLineMeta(item.product_variant_id, patch)}
                        />
                    </PopoverContent>
                </Popover>
                <Button onClick={() => onUpdateQuantity(item.product_variant_id, 0)} variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600">
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button onClick={() => onUpdateQuantity(item.product_variant_id, item.quantity - 1)} variant="outline" size="sm" className="h-8 w-8 p-0"><Minus className="w-3 h-3" /></Button>
                <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                <Button onClick={() => onUpdateQuantity(item.product_variant_id, item.quantity + 1)} variant="outline" size="sm" className="h-8 w-8 p-0"><Plus className="w-3 h-3" /></Button>
            </div>
            <div className="text-right font-semibold text-slate-900 dark:text-white text-sm">
                ${f2(item.price * item.quantity)}
            </div>
        </div>
    </div>
);

export function CartPanel({
    items, totals, lineMeta, onUpdateQuantity, onUpdateLineMeta,
    onClearCart, onCheckout, onHold, isProcessing
}: CartPanelProps) {

    return (
        <div className="h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col rounded-lg shadow-sm">
            {/* ---- CABECERA DEL CARRITO ---- */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="font-semibold text-lg">Orden Actual</h2>
            </div>

            {/* ---- LISTA DE ITEMS (SCROLLABLE) ---- */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {items.length === 0 ? <EmptyCart /> : (
                    <div className="space-y-3">
                        {items.map(item => (
                            <CartItemCard
                                key={item.product_variant_id}
                                item={item}
                                lineMeta={lineMeta[item.product_variant_id]}
                                onUpdateQuantity={onUpdateQuantity}
                                onUpdateLineMeta={onUpdateLineMeta}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ---- FOOTER CON TOTALES Y ACCIONES (AHORA VISIBLE) ---- */}
            {items.length > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-sm space-y-1 mb-4">
                        <div className="flex justify-between"><span>Subtotal</span><span>${f2(totals.subtotal)}</span></div>
                        <div className="flex justify-between text-red-600"><span>Descuentos</span><span>-${f2(totals.discount_total)}</span></div>
                        <div className="flex justify-between"><span>Impuestos</span><span>${f2(totals.tax_total)}</span></div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between my-4">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Total a Pagar:</span>
                        <span className="font-bold text-3xl text-emerald-600 dark:text-emerald-400">${f2(totals.total)}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onHold} disabled={isProcessing} variant="outline" className="flex-1">
                            <Pause className="w-4 h-4 mr-2" /> Poner en Espera
                        </Button>
                        <Button onClick={onCheckout} disabled={isProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-base font-bold">
                            <DollarSign className="w-5 h-5 mr-2" /> Cobrar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}