import React, { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SaleReturnController from '@/actions/App/Http/Controllers/Sales/SaleReturnController';
import { router } from '@inertiajs/react';

interface ReturnLineDto {
    id: number;
    sale_line_id: number;
    qty: number;
    refund_amount: number;
    subtotal_part: number;
    tax_part: number;
    discount_part: number;
    reason?: string | null;
}

interface PageProps extends Record<string, unknown> {
    // Renombrado para evitar confusiones con la palabra clave 'return'
    saleReturn: {
        id: number;
        sale_id: number;
        sale_number?: string;
        currency_code: string;
        total_refund: number;
        subtotal_refund: number;
        tax_refund: number;
        discount_refund: number;
        cost_refund: number;
        created_at: string;
        journal_id?: number | string | null; // si el backend lo envía
    };
    lines: ReturnLineDto[];
}

export default function Show() {
    const { props } = usePage<PageProps>();

    // Fallback defensivo por si el servidor aún no coloca todo
    const r = props.saleReturn;
    const lines = (props.lines ?? []).slice().sort((a, b) => a.sale_line_id - b.sale_line_id);

    // Formateadores (memo para evitar recalcular en cada render)
    const money = useMemo(() => {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: r.currency_code || 'DOP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        } catch {
            // Si viene una currency rara, fallback a número con 2 decimales
            return new Intl.NumberFormat(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }
    }, [r.currency_code]);

    const dateFmt = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        []
    );

    const fmtMoney = (n: number | null | undefined) => money.format(Number(n ?? 0));
    const fmtDate = (iso: string | null | undefined) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
    };
    const pdfUrl = SaleReturnController.pdf.url({ saleReturn: r.id })
    const excelUrl = SaleReturnController.excel.url({ saleReturn: r.id })

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-semibold">
                Devolución #{r.id} de Venta #{r.sale_number ?? r.sale_id}
            </h1>
            <div className="flex gap-2 justify-end">
                <a href={pdfUrl} target="_blank" rel="noopener" className="underline">Descargar PDF</a>
                <a href={excelUrl} className="underline">Descargar Excel</a>
                <button onClick={() => window.print()} className="underline">Imprimir</button>
            </div>


            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Importes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{fmtMoney(r.subtotal_refund)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Impuestos</span>
                            <span>{fmtMoney(r.tax_refund)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Descuentos</span>
                            <span>{fmtMoney(r.discount_refund)}</span>
                        </div>
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>{fmtMoney(r.total_refund)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Costeo</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="flex justify-between">
                            <span>Costo retornado</span>
                            <span>{fmtMoney(r.cost_refund)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Auditoría</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="flex justify-between">
                            <span>Fecha</span>
                            <span>{fmtDate(r.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Journal</span>
                            <span className="text-muted-foreground">
                                {r.journal_id ?? '—'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Líneas devueltas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground px-2">
                        <div className="col-span-6">Línea</div>
                        <div className="col-span-2 text-right">Cant.</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                        <div className="col-span-2 text-right">Impuesto</div>
                    </div>

                    <div className="divide-y">
                        {lines.map((l) => (
                            <div
                                key={l.id}
                                className="grid grid-cols-12 items-center py-2 px-2 text-sm"
                            >
                                <div className="col-span-6">
                                    <div className="font-medium">#{l.sale_line_id}</div>
                                    {l.reason ? (
                                        <div className="text-xs text-muted-foreground">{l.reason}</div>
                                    ) : null}
                                </div>
                                <div className="col-span-2 text-right">{l.qty}</div>
                                <div className="col-span-2 text-right">{fmtMoney(l.subtotal_part)}</div>
                                <div className="col-span-2 text-right">{fmtMoney(l.tax_part)}</div>
                            </div>
                        ))}

                        {lines.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No hay líneas devueltas.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
