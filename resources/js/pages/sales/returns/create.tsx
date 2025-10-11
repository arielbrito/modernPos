import React, { useMemo, useState, useCallback, ChangeEvent } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ReturnLineRow from './partials/ReturnLineRow';
import RefundSummary from './partials/RefundSummary';
// ✅ Wayfinder: mantiene este import
import SaleReturnController from '@/actions/App/Http/Controllers/Sales/SaleReturnController';
import AppLayout from '@/layouts/app-layout';

type ReturnLinePayload = { sale_line_id: number; qty: number; reason?: string };

type FormShape = {
    sale_id: number;
    reason: string;
    lines: ReturnLinePayload[];
    cash_refund_enabled: boolean;
    cash_refund_amount: string;      // string para atar al <input type="number">
    cash_refund_reference: string;
    cash_refund_currency: string;
};


interface SaleLineDto {
    id: number;
    variant_id: number;
    name: string;
    sku: string;
    qty: number;
    remaining_qty: number;
    unit_price: number;
    line_total: number;
    line_subtotal: number;
    tax_total: number;
    discount_total: number;
}

interface PageProps extends Record<string, unknown> {
    sale: {
        id: number;
        number: string;
        currency_code: string;
        customer_id?: number | null;
    };
    lines: SaleLineDto[];
    defaults: { cash_refund_enabled: boolean; currency_code: string };
}



export default function Create() {
    const { props } = usePage<PageProps>();
    const { sale, lines, defaults } = props;

    const [useCashRefund, setUseCashRefund] = useState<boolean>(
        Boolean(defaults?.cash_refund_enabled)
    );
    const [cashAmount, setCashAmount] = useState<string>('');
    const [cashRef, setCashRef] = useState<string>('');

    const { data, setData, processing, transform, post } = useForm<FormShape>({
        sale_id: sale.id,
        reason: '',
        lines: [],
        cash_refund_enabled: Boolean(defaults?.cash_refund_enabled),
        cash_refund_amount: '',
        cash_refund_reference: '',
        cash_refund_currency: defaults.currency_code || sale.currency_code,
    });


    const setReason = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => setData('reason', e.target.value),
        [setData]
    );

    const handleQtyChange = (lineId: number, qty: number, reason?: string) => {
        const prev = data.lines; // <- usamos el estado actual
        const other = prev.filter((l) => l.sale_line_id !== lineId);
        const newLines = qty > 0 ? [...other, { sale_line_id: lineId, qty, reason }] : other;
        setData('lines', newLines); // ✅ pasa un array, no una función
    };


    const selectedMap = useMemo(
        () => new Map(data.lines.map((l) => [l.sale_line_id, l.qty])),
        [data.lines]
    );

    const totals = useMemo(() => {
        let subtotal = 0, tax = 0, discount = 0, total = 0;

        for (const line of lines) {
            const qty = selectedMap.get(line.id) ?? 0;
            if (!qty) continue;

            const denom = Math.max(1, line.qty);
            const perTotal = (line.line_total ?? 0) / denom;
            const perSub = (line.line_subtotal ?? line.line_total ?? 0) / denom;
            const perTax = (line.tax_total ?? 0) / denom;
            const perDisc = (line.discount_total ?? 0) / denom;

            subtotal += perSub * qty;
            tax += perTax * qty;
            discount += perDisc * qty;
            total += perTotal * qty;
        }

        const r = (n: number) => Math.round(n * 100) / 100;
        return { subtotal: r(subtotal), tax: r(tax), discount: r(discount), total: r(total) };
    }, [lines, selectedMap]);

    const onSubmit = () => {
        if (data.lines.length === 0) {
            toast.error('Selecciona al menos una línea con cantidad > 0');
            return;
        }

        for (const l of data.lines) {
            const base = lines.find(x => x.id === l.sale_line_id);
            if (!base) continue;
            if (l.qty <= 0) {
                toast.error(`Cantidad inválida en ${base.name}`);
                return;
            }
            if (l.qty > base.remaining_qty) {
                toast.error(`La cantidad supera lo disponible a devolver en ${base.name}`);
                return;
            }
        }

        const amount = Number.parseFloat(data.cash_refund_amount || '0');
        const refund =
            data.cash_refund_enabled
                ? (() => {
                    if (!Number.isFinite(amount) || amount <= 0) {
                        toast.error('Monto de reembolso inválido');
                        return null;
                    }
                    const max = lines.reduce((acc, line) => {
                        const sel = (data.lines.find(l => l.sale_line_id === line.id)?.qty) ?? 0;
                        if (!sel) return acc;
                        const denom = Math.max(1, line.qty);
                        const perTotal = (line.line_total ?? 0) / denom;
                        return acc + perTotal * sel;
                    }, 0);
                    if (amount > Math.round(max * 100) / 100) {
                        toast.error('El monto excede el total a devolver');
                        return null;
                    }
                    return {
                        currency_code: data.cash_refund_currency,
                        amount: Math.round(amount * 100) / 100,
                        reference: data.cash_refund_reference?.trim() || undefined,
                    };
                })()
                : null;

        if (data.cash_refund_enabled && refund === null) return;

        // Construimos el body final que espera tu backend:
        const body = {
            sale_id: data.sale_id,
            reason: data.reason.trim(),
            lines: data.lines,
            cash_refund: refund, // <- objeto o null (ya fuera del estado del form)
        };

        router.post(SaleReturnController.store.url(), body, {
            preserveScroll: true,
            onSuccess: (page) => {
                toast.success('Devolución creada');
                const redirect =
                    (page as any)?.props?.flash?.redirect ||
                    (page as any)?.redirect || null;
                if (redirect) router.visit(redirect);
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('No fue posible crear la devolución');
            },
        });
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        Devolución de Venta #{sale.number}
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Motivo general</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor="reason">Motivo</Label>
                        <Input
                            id="reason"
                            value={data.reason}
                            onChange={setReason}
                            placeholder="Opcional"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Selecciona líneas a devolver</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground px-2">
                            <div className="col-span-5">Producto</div>
                            <div className="col-span-2 text-right">Vendida</div>
                            <div className="col-span-2 text-right">Disponible</div>
                            <div className="col-span-3 text-right">Cantidad a devolver</div>
                        </div>
                        <div className="divide-y">
                            {lines.map((l) => (
                                <ReturnLineRow
                                    key={l.id}
                                    line={l}
                                    qty={selectedMap.get(l.id) ?? 0}
                                    onChange={(qty, reason) => handleQtyChange(l.id, qty, reason)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reembolso</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Reintegrar por caja</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Si lo desactivas, se creará crédito a favor del cliente
                                    </p>
                                </div>

                                <Switch
                                    checked={data.cash_refund_enabled}
                                    onCheckedChange={(v) => setData('cash_refund_enabled', v)}
                                />
                            </div>

                            {data.cash_refund_enabled && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Monto ({sale.currency_code})</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            inputMode="decimal"
                                            value={data.cash_refund_amount}
                                            onChange={(e) => setData('cash_refund_amount', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <Label>Referencia</Label>
                                        <Input
                                            value={data.cash_refund_reference}
                                            onChange={(e) => setData('cash_refund_reference', e.target.value)}
                                            placeholder="Opcional (voucher/nota)"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <RefundSummary totals={totals} currency={sale.currency_code} />
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => window.history.back()}>
                        Cancelar
                    </Button>
                    <Button disabled={processing} onClick={onSubmit}>
                        Confirmar devolución
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
