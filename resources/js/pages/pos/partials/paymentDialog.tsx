/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    CreditCard,
    Banknote,
    Smartphone,
    Package,
    Plus,
    X,
    Wallet,
    Check,
    DollarSign,
    Receipt,
    ArrowRightLeft,
    Calculator,
    Shield,
    Star
} from 'lucide-react';

import { JSX } from 'react/jsx-runtime';
import { cn } from '@/lib/utils';
import { CARD_BRANDS, DOMINICAN_BANKS } from '../libs/pos-constants'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// --- TIPOS Y METADATOS ---

type Method = 'cash' | 'card' | 'transfer' | 'other';

export type UIPayment = {
    method: Method;
    amount: number;
    currency_code: string;
    fx_rate_to_sale?: number;
    reference?: string | null;
    bank_name?: string | null;
    card_brand?: string | null;
    card_last4?: string | null;
    tendered_amount?: number;
    change_amount?: number;
    change_currency_code?: string;
};

type PaymentDialogProps = {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    total: number;
    saleCurrency: string;
    currencies: string[];
    defaultFx?: Record<string, number>;
    onSubmit: (payments: UIPayment[], totalChange: number) => void;
    isProcessing?: boolean;
};

const methodMeta: Record<Method, { label: string; icon: JSX.Element; color: string; bgColor: string; hoverColor: string }> = {
    cash: {
        label: 'Efectivo',
        icon: <Banknote className="w-5 h-5" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        hoverColor: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/40'
    },
    card: {
        label: 'Tarjeta',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-800/40'
    },
    transfer: {
        label: 'Transfer',
        icon: <Smartphone className="w-5 h-5" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-800/40'
    },
    other: {
        label: 'Otro',
        icon: <Package className="w-5 h-5" />,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100 dark:bg-slate-700',
        hoverColor: 'hover:bg-slate-200 dark:hover:bg-slate-600'
    },
};

// --- SUB-COMPONENTES MEJORADOS ---

const PaymentSummary = ({ payments, onRemove, saleCurrency, toSaleCcy }: any) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-xl p-3 border border-primary/30">
                <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-foreground">Pagos Registrados</h2>
                <p className="text-sm text-muted-foreground">
                    {payments.length === 0 ? 'Sin pagos agregados' : `${payments.length} pago${payments.length !== 1 ? 's' : ''}`}
                </p>
            </div>
        </div>

        {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center rounded-2xl p-12 border-2 border-dashed border-border/50 bg-accent/20 backdrop-blur-sm">
                <div className="relative mb-6">
                    <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-xl opacity-40 animate-pulse"></div>
                    <Wallet className="relative w-16 h-16 text-primary/60" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Sin pagos agregados</h3>
                <p className="text-muted-foreground text-sm">Selecciona un método de pago y agrega el monto correspondiente.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {payments.map((p: UIPayment, idx: number) => (
                    <Card key={idx} className="overflow-hidden border-2 border-border/30 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-3 rounded-xl border transition-all duration-200 group-hover:scale-110",
                                        methodMeta[p.method].bgColor,
                                        methodMeta[p.method].color
                                    )}>
                                        {methodMeta[p.method].icon}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg text-foreground">
                                                {p.amount.toFixed(2)}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
                                                {p.currency_code}
                                            </span>
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {methodMeta[p.method].label}
                                        </div>
                                        {(p.bank_name || p.reference) && (
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground/80 bg-accent/30 rounded-lg px-3 py-1.5">
                                                {p.bank_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        {p.bank_name}
                                                    </span>
                                                )}
                                                {p.reference && (
                                                    <span className="flex items-center gap-1">
                                                        <Receipt className="w-3 h-3" />
                                                        #{p.reference}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-2">
                                    {p.currency_code !== saleCurrency && (
                                        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                                            <ArrowRightLeft className="w-3 h-3 text-primary" />
                                            <span className="text-sm font-semibold text-primary">
                                                ≈ {toSaleCcy(p.amount, p.currency_code, p.fx_rate_to_sale).toFixed(2)} {saleCurrency}
                                            </span>
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all duration-200"
                                        onClick={() => onRemove(idx)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {p.method === 'cash' && p.change_amount != null && p.change_amount > 0 && (
                                <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 px-4 py-3 border-t border-border/30">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">
                                            Recibido: <span className="font-semibold text-foreground">{p.tendered_amount?.toFixed(2)} {p.currency_code}</span>
                                        </span>
                                        <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700">
                                            <Calculator className="w-3 h-3" />
                                            <span className="font-bold">
                                                Cambio: {p.change_amount?.toFixed(2)} {p.change_currency_code}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        )}
    </div>
);

// --- COMPONENTE PRINCIPAL ---

export function PaymentDialog({
    isOpen, setIsOpen, total, saleCurrency, currencies, defaultFx = {}, onSubmit, isProcessing = false,
}: PaymentDialogProps) {

    const [payments, setPayments] = useState<UIPayment[]>([]);
    const [method, setMethod] = useState<Method>('cash');
    const [currency, setCurrency] = useState<string>(saleCurrency);
    const [amount, setAmount] = useState<string>('');
    const [fx, setFx] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [tendered, setTendered] = useState<string>('');
    const [changeCcy, setChangeCcy] = useState<string>(saleCurrency);
    const [bankName, setBankName] = useState<string>('');
    const [cardBrand, setCardBrand] = useState<string>('');
    const [cardLast4, setCardLast4] = useState<string>('');

    const toSaleCcy = useCallback((amt: number, ccy: string, fxRate?: number) =>
        ccy === saleCurrency ? amt : (fxRate ?? defaultFx[ccy] ?? 1) * amt,
        [saleCurrency, defaultFx]
    );

    const paidInSale = useMemo(() =>
        payments.reduce((s, p) => s + toSaleCcy(p.amount, p.currency_code, p.fx_rate_to_sale), 0),
        [payments, toSaleCcy]
    );

    const totalChangeInSaleCcy = useMemo(() =>
        payments.filter(p => p.method === 'cash').reduce((s, p) => {
            const changeAmt = p.change_amount ?? 0;
            const ccy = p.change_currency_code ?? p.currency_code;
            return s + toSaleCcy(changeAmt, ccy, p.fx_rate_to_sale);
        }, 0),
        [payments, toSaleCcy]);

    const remaining = Math.max(0, total - paidInSale);
    const isComplete = remaining < 0.01;

    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        if (remaining > 0) {
            const fxNum = currency === saleCurrency ? 1 : (parseFloat(fx) || defaultFx[currency] || 1);
            const remainingInSelectedCcy = remaining / fxNum;
            setAmount(remainingInSelectedCcy.toFixed(2));
        }
    }, [method, currency, remaining, fx, saleCurrency, defaultFx]);

    const resetForm = () => {
        setMethod('cash');
        setCurrency(saleCurrency);
        setAmount('');
        setFx('');
        setReference('');
        setBankName('');
        setCardBrand('');
        setCardLast4('');
        setTendered('');
        setChangeCcy(saleCurrency);
    };

    const addPayment = () => {
        const amt = parseFloat(amount) || 0;
        if (amt <= 0) return;

        const fxNum = currency === saleCurrency ? undefined : (parseFloat(fx) || defaultFx[currency] || undefined);

        const newPayment: UIPayment = {
            method,
            amount: amt,
            currency_code: currency,
            fx_rate_to_sale: fxNum,
            reference: reference?.trim() || null,
            bank_name: bankName || null,
            card_brand: cardBrand || null,
            card_last4: cardLast4 || null,
        };

        if (method === 'cash') {
            let tender = parseFloat(tendered);
            if (isNaN(tender) || tender < amt) {
                tender = amt;
            }

            const changeInPayCcy = Math.max(0, tender - amt);
            let finalChangeAmount = changeInPayCcy;

            if (changeCcy !== currency) {
                const rate = parseFloat(fx) || defaultFx[currency] || 1;
                finalChangeAmount = changeInPayCcy * rate;
            }

            newPayment.tendered_amount = parseFloat(tender.toFixed(2));
            newPayment.change_amount = parseFloat(finalChangeAmount.toFixed(2));
            newPayment.change_currency_code = changeCcy;
        }

        setPayments(prev => [...prev, newPayment]);
        resetForm();
    };

    const removePayment = (idx: number) => {
        setPayments(prev => prev.filter((_, i) => i !== idx));
    };

    const confirm = () => {
        if (!isComplete) return;
        onSubmit(payments, totalChangeInSaleCcy);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-6xl h-[92vh] flex flex-col p-0 gap-0 rounded-3xl border-2 border-border/50 shadow-2xl overflow-hidden">
                {/* Header mejorado */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 gradient-stoneretail opacity-90"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>

                    <DialogHeader className="relative p-6 sm:p-8 text-center text-white">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/30">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-bold tracking-tight">Procesar Pago</DialogTitle>
                                <p className="text-white/80 text-sm mt-1">Complete la transacción de venta</p>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 inline-block">
                            <span className="text-white/80 text-sm font-medium block mb-1">Total de la Venta</span>
                            <div className="flex items-baseline justify-center gap-2 mb-1">
                                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white -mt-6">
                                    {total.toFixed(2)}
                                </span>
                                <span className="text-2xl font-bold text-white/70">
                                    {saleCurrency}
                                </span>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Content área mejorada */}
                <div className="flex-grow grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 p-6 sm:p-8 overflow-y-auto bg-gradient-to-br from-background via-accent/10 to-background scrollbar-stoneretail">

                    {/* Panel de entrada de pagos */}
                    <div className="space-y-6">
                        {/* Selector de método mejorado */}
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold text-foreground">Método de Pago</Label>
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-3">
                                {(['cash', 'card', 'transfer', 'other'] as Method[]).map(k => (
                                    <Button
                                        key={k}
                                        variant={method === k ? 'default' : 'outline'}
                                        className={cn(
                                            "h-14 text-sm flex items-center justify-center gap-3 rounded-xl border-2 transition-all duration-300 font-semibold",
                                            method === k
                                                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105 border-primary"
                                                : "hover:border-primary/40 hover:bg-accent/60 hover:scale-105"
                                        )}
                                        onClick={() => setMethod(k)}
                                    >
                                        <div className={method === k ? "text-primary-foreground" : methodMeta[k].color}>
                                            {methodMeta[k].icon}
                                        </div>
                                        <span>{methodMeta[k].label}</span>
                                        {method === k && <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Campos de monto y moneda mejorados */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-sm font-semibold">Monto ({currency})</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="text-xl h-14 pl-10 rounded-xl border-2 font-bold pos-input pos-focus"
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency" className="text-sm font-semibold">Moneda</Label>
                                <select
                                    id="currency"
                                    className="block w-full h-14 rounded-xl border-2 border-input bg-background px-4 py-2 text-lg font-semibold pos-focus transition-all duration-200 hover:border-primary/40"
                                    value={currency}
                                    onChange={(e) => {
                                        const c = e.target.value;
                                        setCurrency(c);
                                        setFx(c !== saleCurrency ? (defaultFx[c] ?? '').toString() : '');
                                    }}
                                >
                                    {currencies.map(ccy => <option key={ccy} value={ccy}>{ccy}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Tasa de cambio mejorada */}
                        {currency !== saleCurrency && (
                            <div className="space-y-2">
                                <Label htmlFor="fx_rate" className="text-sm font-semibold flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Tasa de Cambio (1 {currency} → {saleCurrency})
                                </Label>
                                <Input
                                    id="fx_rate"
                                    value={fx}
                                    onChange={(e) => setFx(e.target.value)}
                                    type="number"
                                    step="0.0001"
                                    placeholder={(defaultFx[currency] ?? '').toString()}
                                    className="h-12 rounded-xl border-2 pos-input pos-focus font-semibold"
                                />
                            </div>
                        )}

                        {/* Panel de detalles mejorado */}
                        <Card className="border-2 border-border/50 rounded-2xl shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-4 bg-gradient-to-r from-accent/20 to-transparent">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Detalles del Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {method === 'cash' && (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tendered" className="text-sm font-semibold">Recibido ({currency})</Label>
                                            <Input
                                                id="tendered"
                                                value={tendered}
                                                onChange={(e) => setTendered(e.target.value)}
                                                type="number"
                                                step="0.01"
                                                placeholder={amount || '0.00'}
                                                className="h-12 rounded-xl border-2 pos-input pos-focus font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="changeCcy" className="text-sm font-semibold">Devolución en</Label>
                                            <select
                                                id="changeCcy"
                                                className="block w-full h-12 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-semibold pos-focus transition-all duration-200 hover:border-primary/40"
                                                value={changeCcy}
                                                onChange={(e) => setChangeCcy(e.target.value)}
                                            >
                                                {currencies.map(ccy => <option key={ccy} value={ccy}>{ccy}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {method === 'card' && (
                                    <div className="space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="cardBrand" className="text-sm font-semibold">Marca Tarjeta</Label>
                                                <Select value={cardBrand} onValueChange={setCardBrand}>
                                                    <SelectTrigger id="cardBrand" className="h-12 rounded-xl border-2 pos-focus">
                                                        <SelectValue placeholder="Seleccione una marca..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {CARD_BRANDS.map(brand => (
                                                            <SelectItem key={brand} value={brand} className="rounded-lg">
                                                                {brand}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="cardLast4" className="text-sm font-semibold">Últimos 4 Dígitos</Label>
                                                <Input
                                                    id="cardLast4"
                                                    value={cardLast4}
                                                    onChange={e => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    maxLength={4}
                                                    placeholder="1234"
                                                    className="h-12 rounded-xl border-2 pos-input pos-focus font-mono font-bold text-center text-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankNameCard" className="text-sm font-semibold">Banco Emisor</Label>
                                            <Select value={bankName} onValueChange={setBankName}>
                                                <SelectTrigger id="bankNameCard" className="h-12 rounded-xl border-2 pos-focus">
                                                    <SelectValue placeholder="Seleccione un banco..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {DOMINICAN_BANKS.map(bank => (
                                                        <SelectItem key={bank} value={bank} className="rounded-lg">
                                                            {bank}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="referenceCard" className="text-sm font-semibold">Código de Confirmación</Label>
                                            <Input
                                                id="referenceCard"
                                                value={reference}
                                                onChange={e => setReference(e.target.value)}
                                                placeholder="Ej: 001234"
                                                className="h-12 rounded-xl border-2 pos-input pos-focus font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                {method === 'transfer' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bankNameTransfer" className="text-sm font-semibold">Banco</Label>
                                            <Select value={bankName} onValueChange={setBankName}>
                                                <SelectTrigger id="bankNameTransfer" className="h-12 rounded-xl border-2 pos-focus">
                                                    <SelectValue placeholder="Seleccione un banco..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {DOMINICAN_BANKS.map(bank => (
                                                        <SelectItem key={bank} value={bank} className="rounded-lg">
                                                            {bank}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="referenceTransfer" className="text-sm font-semibold">Código de Confirmación</Label>
                                            <Input
                                                id="referenceTransfer"
                                                value={reference}
                                                onChange={e => setReference(e.target.value)}
                                                placeholder="Ej: 987654"
                                                className="h-12 rounded-xl border-2 pos-input pos-focus font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                {method === 'other' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reference" className="text-sm font-semibold">Referencia (Opcional)</Label>
                                        <Input
                                            id="reference"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="Ej: Cupón #123, etc."
                                            className="h-12 rounded-xl border-2 pos-input pos-focus"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Botón agregar pago mejorado */}
                        <Button
                            onClick={addPayment}
                            disabled={Number(amount) <= 0 || isProcessing}
                            className="w-full h-16 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-6 h-6 mr-3" />
                            Agregar Pago
                            <div className="ml-3 w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
                        </Button>
                    </div>

                    {/* Panel de resumen de pagos */}
                    <div className="h-full flex flex-col">
                        <PaymentSummary payments={payments} onRemove={removePayment} saleCurrency={saleCurrency} toSaleCcy={toSaleCcy} />
                    </div>
                </div>

                {/* Footer mejorado con glassmorphism */}
                <div className="relative border-t-2 border-border/30 bg-gradient-to-r from-card via-accent/20 to-card backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>

                    <DialogFooter className="relative p-6 sm:p-8">
                        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
                            {/* Indicador de faltante mejorado */}
                            <div className="flex items-center gap-4">
                                <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 border-2 border-border/30 min-w-0">
                                    <div className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                                        <Calculator className="w-4 h-4" />
                                        {isComplete ? 'Completado' : 'Faltante'}
                                    </div>
                                    <div className={cn(
                                        "text-2xl sm:text-3xl font-bold transition-all duration-300",
                                        isComplete
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-amber-600 dark:text-amber-400"
                                    )}>
                                        {isComplete ? '0.00' : remaining.toFixed(2)}
                                        <span className="text-lg font-medium text-muted-foreground ml-2">
                                            {saleCurrency}
                                        </span>
                                    </div>
                                    {isComplete && (
                                        <div className="flex items-center gap-2 mt-2 text-emerald-600 dark:text-emerald-400">
                                            <Check className="w-4 h-4" />
                                            <span className="text-sm font-medium">Listo para procesar</span>
                                        </div>
                                    )}
                                </div>

                                {/* Información adicional */}
                                <div className="hidden lg:block space-y-2 text-sm text-muted-foreground">
                                    <div>Pagado: <span className="font-semibold text-foreground">{paidInSale.toFixed(2)} {saleCurrency}</span></div>
                                    <div>Total: <span className="font-semibold text-primary">{total.toFixed(2)} {saleCurrency}</span></div>
                                </div>
                            </div>

                            {/* Botón confirmar mejorado */}
                            <Button
                                onClick={confirm}
                                disabled={isProcessing || !isComplete}
                                className={cn(
                                    "w-full sm:w-auto min-w-[200px] h-16 text-xl font-bold rounded-2xl transition-all duration-300 shadow-2xl relative overflow-hidden",
                                    isComplete
                                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/40 hover:shadow-primary/60 hover:scale-[1.05] active:scale-[0.98]"
                                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                )}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-foreground border-t-transparent mr-3"></div>
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-6 h-6 mr-3" />
                                        Confirmar Venta
                                        {isComplete && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
                                        )}
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Información de StoneRetail */}
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground/75">
                            <Shield className="w-3 h-3" />
                            <span>StoneRetail POS • Transacción Segura</span>
                        </div>
                    </DialogFooter>
                </div>

                {/* Overlay de procesamiento */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-3xl z-50">
                        <div className="bg-primary/20 rounded-3xl p-8 border-2 border-primary/30 backdrop-blur-sm flex flex-col items-center gap-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
                            <div className="text-center">
                                <h3 className="font-bold text-xl text-foreground mb-2">Procesando Pago</h3>
                                <p className="text-muted-foreground">Por favor, espere mientras procesamos la transacción...</p>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}