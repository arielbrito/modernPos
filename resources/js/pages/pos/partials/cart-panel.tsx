/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    ShoppingCart,
    Plus,
    Minus,
    X,
    MoreVertical,
    DollarSign,
    Pause,
    Receipt,
    Trash2,
    Package,
    Star,
    TrendingUp
} from 'lucide-react';
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
        <div className="relative mb-6">
            <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative bg-accent/30 rounded-full p-6 border-2 border-border/30">
                <ShoppingCart className="w-16 h-16 text-primary relative z-10" />
            </div>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
            Carrito Vacío
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-xs">
            Agrega productos desde el catálogo para comenzar una nueva venta.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/75">
            <Package className="w-4 h-4" />
            <span>Listo para vender</span>
        </div>
    </div>
);

const CartItemCard = ({ item, lineMeta, onUpdateQuantity, onUpdateLineMeta }: {
    item: CartItem;
    lineMeta: LineMeta | undefined;
    onUpdateQuantity: (id: number, qty: number) => void;
    onUpdateLineMeta: (id: number, patch: Partial<LineMeta>) => void;
}) => (
    <div className="group bg-card rounded-xl p-4 border-2 border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-3">
                    <div className="flex items-start gap-2">
                        <div className="flex-1">
                            <h4 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors duration-200" title={item.name}>
                                {item.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                    ${f2(item.price)} c/u
                                </p>
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-accent hover:scale-110 transition-all duration-200"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-3 rounded-xl border-2 shadow-xl">
                            <LineEditor
                                meta={lineMeta}
                                onChange={(patch) => onUpdateLineMeta(item.product_variant_id, patch)}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        onClick={() => onUpdateQuantity(item.product_variant_id, 0)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:scale-110 transition-all duration-200"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/30">
                        <Button
                            onClick={() => onUpdateQuantity(item.product_variant_id, item.quantity - 1)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-md hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-110"
                            disabled={item.quantity <= 1}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm bg-background rounded-md py-1 border border-border/30">
                            {item.quantity}
                        </span>
                        <Button
                            onClick={() => onUpdateQuantity(item.product_variant_id, item.quantity + 1)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-md hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-110"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                <div className="text-right">
                    <div className="font-bold text-primary text-lg">
                        ${f2(item.price * item.quantity)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {item.quantity} × ${f2(item.price)}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export function CartPanel({
    items, totals, lineMeta, onUpdateQuantity, onUpdateLineMeta,
    onClearCart, onCheckout, onHold, isProcessing
}: CartPanelProps) {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="h-full bg-card border-2 border-border/50 flex flex-col rounded-2xl shadow-xl overflow-hidden relative">
            {/* Gradiente superior */}
            <div className="absolute top-0 left-0 right-0 h-2 gradient-stoneretail"></div>

            {/* ---- CABECERA DEL CARRITO MEJORADA ---- */}
            <div className="relative p-4 sm:p-6 border-b-2 border-border/30 bg-gradient-to-br from-primary/10 via-accent/20 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="bg-primary/20 rounded-xl p-3 border border-primary/30">
                                <Receipt className="w-6 h-6 text-primary" />
                            </div>
                            {items.length > 0 && (
                                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                                    {items.length}
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-foreground">Orden Actual</h2>
                            <p className="text-sm text-muted-foreground">
                                {items.length === 0 ? 'Sin productos' : `${itemCount} artículo${itemCount !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                    </div>

                    {items.length > 0 && (
                        <Button
                            onClick={onClearCart}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-lg"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* ---- LISTA DE ITEMS (SCROLLABLE) ---- */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-stoneretail">
                {items.length === 0 ? <EmptyCart /> : (
                    <div className="space-y-4">
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

            {/* ---- FOOTER CON TOTALES Y ACCIONES MEJORADO ---- */}
            {items.length > 0 && (
                <div className="p-4 sm:p-6 border-t-2 border-border/30 bg-gradient-to-t from-accent/10 to-transparent backdrop-blur-sm">
                    {/* Resumen de totales */}
                    <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-border/30">
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">${f2(totals.subtotal)}</span>
                            </div>
                            {totals.discount_total > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-red-600 dark:text-red-400">Descuentos</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">-${f2(totals.discount_total)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Impuestos</span>
                                <span className="font-medium">${f2(totals.tax_total)}</span>
                            </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <span className="font-bold text-lg text-foreground">Total a Pagar</span>
                            </div>
                            <span className="font-bold text-2xl sm:text-3xl text-primary">
                                ${f2(totals.total)}
                            </span>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={onHold}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-2 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 font-semibold"
                        >
                            <Pause className="w-5 h-5 mr-2" />
                            Poner en Espera
                        </Button>
                        <Button
                            onClick={onCheckout}
                            disabled={isProcessing}
                            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                            <DollarSign className="w-5 h-5 mr-2" />
                            Procesar Pago
                        </Button>
                    </div>

                    {/* Información adicional */}
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground/75">
                        <Package className="w-3 h-3" />
                        <span>StoneRetail POS • {itemCount} producto{itemCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            )}

            {/* Indicador de procesamiento */}
            {isProcessing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div className="bg-primary/20 rounded-full p-4 border border-primary/30">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                </div>
            )}
        </div>
    );
}