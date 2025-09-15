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
import { CreditCard, Banknote, Smartphone, Package, Plus, X, Wallet, Check } from 'lucide-react';

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
    bank_name?: string | null;      // Para tarjeta y transferencia
    card_brand?: string | null;     // Solo para tarjeta
    card_last4?: string | null;     // Solo para tarjeta   // Para tarjeta y transferencia
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

const methodMeta: Record<Method, { label: string; icon: JSX.Element; color: string }> = {
    cash: { label: 'Efectivo', icon: <Banknote className="w-5 h-5" />, color: 'text-emerald-500' },
    card: { label: 'Tarjeta', icon: <CreditCard className="w-5 h-5" />, color: 'text-blue-500' },
    transfer: { label: 'Transfer', icon: <Smartphone className="w-5 h-5" />, color: 'text-purple-500' },
    other: { label: 'Otro', icon: <Package className="w-5 h-5" />, color: 'text-slate-500' },
};

// --- SUB-COMPONENTES PARA CLARIDAD ---

const PaymentSummary = ({ payments, onRemove, saleCurrency, toSaleCcy }: any) => (
    <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Pagos Registrados</h2>
        {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-slate-500 border-2 border-dashed rounded-xl p-8 h-full">
                <Wallet className="w-12 h-12 mb-4 text-slate-400" />
                <p>Aún no se han agregado pagos.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {payments.map((p: UIPayment, idx: number) => (
                    <Card key={idx} className="overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                        <div className="flex items-start justify-between p-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700 ${methodMeta[p.method].color}`}>
                                    {methodMeta[p.method].icon}
                                </div>
                                <div>
                                    <div className="font-bold text-base">{p.amount.toFixed(2)} <span className="text-sm font-normal text-slate-500">{p.currency_code}</span></div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">{methodMeta[p.method].label}</div>
                                    {/* Mostrar info adicional */}
                                    {(p.bank_name || p.reference) && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {p.bank_name && <span className="mr-2">🏦 {p.bank_name}</span>}
                                            {p.reference && <span>#{p.reference}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                {p.currency_code !== saleCurrency && (
                                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        ≈ {toSaleCcy(p.amount, p.currency_code, p.fx_rate_to_sale).toFixed(2)} {saleCurrency}
                                    </div>
                                )}
                                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => onRemove(idx)}>
                                    <X className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        {p.method === 'cash' && p.change_amount != null && p.change_amount > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs text-blue-800 dark:text-blue-300 flex justify-between">
                                <span>Recibido: {p.tendered_amount?.toFixed(2)} {p.currency_code}</span>
                                <span className="font-semibold">Cambio: {p.change_amount?.toFixed(2)} {p.change_currency_code}</span>
                            </div>
                        )}
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
            // --- LÍNEA CORREGIDA ---
            // Se verifica explícitamente si 'tendered' es un número válido.
            // Si no, se usa el monto del pago como valor por defecto.
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
        resetForm(); // Reset form for the next payment
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
            <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b text-center">
                    <DialogTitle className="text-2xl font-bold">Procesar Pago</DialogTitle>
                    <div className="mt-1">
                        <span className="text-sm text-muted-foreground">Total de la Venta</span>
                        <p className="text-5xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{total.toFixed(2)} <span className="text-2xl font-medium text-slate-400">{saleCurrency}</span></p>
                    </div>
                </DialogHeader>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Método de Pago</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {(['cash', 'card', 'transfer', 'other'] as Method[]).map(k => (
                                    <Button key={k} variant={method === k ? 'default' : 'outline'} className="h-12 text-sm flex items-center justify-center gap-2" onClick={() => setMethod(k)}>
                                        {methodMeta[k].icon}
                                        <span>{methodMeta[k].label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="amount">Monto ({currency})</Label>
                                <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" className="text-lg h-12" />
                            </div>
                            <div>
                                <Label htmlFor="currency">Moneda</Label>
                                <select id="currency" className="block w-full h-12 rounded-md border-input bg-background px-3 py-2 text-lg" value={currency} onChange={(e) => { const c = e.target.value; setCurrency(c); setFx(c !== saleCurrency ? (defaultFx[c] ?? '').toString() : ''); }}>
                                    {currencies.map(ccy => <option key={ccy} value={ccy}>{ccy}</option>)}
                                </select>
                            </div>
                        </div>

                        {currency !== saleCurrency && (
                            <div>
                                <Label htmlFor="fx_rate">Tasa de Cambio (1 {currency} → {saleCurrency})</Label>
                                <Input id="fx_rate" value={fx} onChange={(e) => setFx(e.target.value)} type="number" step="0.0001" placeholder={(defaultFx[currency] ?? '').toString()} />
                            </div>
                        )}



                        <div className="p-4 border rounded-lg bg-white dark:bg-slate-800 space-y-4">
                            <h3 className="font-semibold text-md">Detalles del Pago</h3>
                            {method === 'cash' && (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="tendered">Recibido ({currency})</Label>
                                        <Input id="tendered" value={tendered} onChange={(e) => setTendered(e.target.value)} type="number" step="0.01" placeholder={amount || '0.00'} />
                                    </div>
                                    <div>
                                        <Label htmlFor="changeCcy">Devolución en</Label>
                                        <select id="changeCcy" className="block w-full h-10 rounded-md border-input bg-background px-3 py-2 text-sm" value={changeCcy} onChange={(e) => setChangeCcy(e.target.value)}>
                                            {currencies.map(ccy => <option key={ccy} value={ccy}>{ccy}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}


                            {method === 'card' && (
                                <div className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="cardBrand">Marca Tarjeta</Label>
                                            <Select value={cardBrand} onValueChange={setCardBrand}>
                                                <SelectTrigger id="cardBrand" className="h-10">
                                                    <SelectValue placeholder="Seleccione una marca..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CARD_BRANDS.map(brand => (
                                                        <SelectItem key={brand} value={brand}>
                                                            {brand}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="cardLast4">Últimos 4 Dígitos</Label>
                                            <Input id="cardLast4" value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} placeholder="1234" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="bankNameCard">Banco Emisor</Label>
                                        <Select value={bankName} onValueChange={setBankName}>
                                            <SelectTrigger id="bankNameCard" className="h-10">
                                                <SelectValue placeholder="Seleccione un banco..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOMINICAN_BANKS.map(bank => (
                                                    <SelectItem key={bank} value={bank}>
                                                        {bank}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="referenceCard">Código de Confirmación</Label>
                                        <Input id="referenceCard" value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: 001234" />
                                    </div>
                                </div>

                            )}
                            {method === 'transfer' && (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="bankNameTransfer">Banco</Label>
                                        <Select value={bankName} onValueChange={setBankName}>
                                            <SelectTrigger id="bankNameTransfer" className="h-10">
                                                <SelectValue placeholder="Seleccione un banco..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DOMINICAN_BANKS.map(bank => (
                                                    <SelectItem key={bank} value={bank}>
                                                        {bank}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="referenceTransfer">Código de Confirmación</Label>
                                        <Input id="referenceTransfer" value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: 987654" />
                                    </div>
                                </div>
                            )}

                            {method === 'other' && (
                                <div>
                                    <Label htmlFor="reference">Referencia (Opcional)</Label>
                                    <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: Cupón #123, etc." />
                                </div>
                            )}
                        </div>

                        <div>
                            <Button onClick={addPayment} disabled={Number(amount) <= 0 || isProcessing} className="w-full h-12 text-base">
                                <Plus className="w-5 h-5 mr-2" />
                                Agregar Pago
                            </Button>
                        </div>
                    </div>
                    <div className="h-full">
                        <PaymentSummary payments={payments} onRemove={removePayment} saleCurrency={saleCurrency} toSaleCcy={toSaleCcy} />
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-6 border-t bg-white dark:bg-slate-800">
                    <div className="w-full flex items-center justify-between gap-6">
                        <div className="space-y-1 text-right">
                            <div className="text-lg font-semibold">Faltante:</div>
                            <div className={cn("text-3xl font-bold", isComplete ? "text-green-600" : "text-red-600")}>
                                {remaining.toFixed(2)} <span className="text-lg font-medium">{saleCurrency}</span>
                            </div>
                        </div>
                        <Button onClick={confirm} disabled={isProcessing || !isComplete} className="w-full max-w-xs h-14 text-lg font-bold" size="lg">
                            {isProcessing ? "Procesando..." : <><Check className="w-6 h-6 mr-2" />Confirmar Venta</>}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}