/* eslint-disable @typescript-eslint/no-unused-vars */

import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Download, PiggyBank, Receipt, Scale, Wallet } from "lucide-react";
import CashShiftReportController from "@/actions/App/Http/Controllers/Cash/CashShiftReportController";

// --- TIPOS CORREGIDOS ---
// Estos tipos ahora reflejan la estructura de objeto que envía tu backend.

type CountDetailProps = {
    title: string;
    countData?: {
        by_currency: Record<string, { lines: CountLine[]; total: number }>;
        totals: number;
    };
};

type PaymentRow = {
    method: string;
    currency_code: string;
    count: number;
    amount: string | number;
    amount_in_sale_ccy: string | number;
};

type SalesTotalsRow = { currency_code: string; count: number; total: string | number };

type CountLine = {
    denomination: number;
    kind: "bill" | "coin";
    qty: number;
    subtotal: number;
};

type SummaryData = {
    opening: number;
    income: number;
    expense: number;
    change: number;
    expected: number;
    counted: number;
    variance: number;
};

type CountData = {
    lines: CountLine[];
    total: number;
};

type Report = {
    shift: {
        id: number;
        status: string;
        opened_at: string;
        closed_at?: string | null;
        register: { id: number; name: string };
        store: { id: number; code: string; name: string };
    };
    sales: {
        count: number;
        totals_by_currency: SalesTotalsRow[];
    };
    payments: {
        rows: PaymentRow[];
        cash_in: number;
        cash_change_out: number;
    };
    summary: {
        by_currency: Record<string, SummaryData>; // Objeto con llaves de moneda
        totals: SummaryData;
    };
    counts: {
        opening: {
            by_currency: Record<string, CountData>;
            totals: number;
        };
        closing: {
            by_currency: Record<string, CountData>; // Objeto con llaves de moneda
            totals: number;
        };
    };
    cash_movements: Array<{
        currency_code: string;
        cash_in: number;
        cash_out: number;
        net: number;
    }> | null;
};

// --- Tipos auxiliares para renderizar ---
type ClosingByCurrencyItem = {
    currency_code: string;
    total_counted: number;
    lines: CountLine[];
};

type SummaryByCurrencyItem = {
    currency_code: string;
    opening: number;
    income: number;
    expense: number;
    change_out: number;
    estimated: number;
};


type Props = { report: Report };

const money = (n: number, c = "DOP") =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2,
    }).format(Number(n || 0));



function CountDetailCard({ title, countData }: CountDetailProps) {
    // Si no hay datos de conteo, no renderizamos nada.
    if (!countData || Object.keys(countData.by_currency).length === 0) {
        return null;
    }

    // Convertimos el objeto de monedas en un arreglo para poder iterarlo
    const currencyBreakdown = Object.entries(countData.by_currency);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <p className="text-2xl font-bold pt-1">{money(countData.totals)}</p>
            </CardHeader>
            <CardContent className="space-y-6">
                {currencyBreakdown.map(([ccy, data]) => {
                    const lines = (data.lines || []).filter((l) => Number(l.qty) > 0);
                    if (lines.length === 0) return null; // No mostrar si no hay desglose

                    return (
                        <div key={ccy} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Moneda: {ccy}</div>
                                <div className="font-semibold">{money(data.total, ccy)}</div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table className="text-sm">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Denominación</TableHead>
                                            <TableHead className="text-right">Cantidad</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map((ln, idx) => (
                                            <TableRow key={`${ccy}-${idx}`}>
                                                <TableCell>
                                                    {`${ln.kind === "bill" ? "Billete" : "Moneda"} de ${money(ln.denomination, ccy)}`}
                                                </TableCell>
                                                <TableCell className="text-right">{ln.qty}</TableCell>
                                                <TableCell className="text-right">
                                                    {money(ln.subtotal, ccy)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

export default function ShiftReport({ report }: Props) {
    const { shift, sales, payments, summary, counts } = report;

    // --- LÓGICA DE DATOS AJUSTADA ---

    const salesByCurrencyText = (sales?.totals_by_currency ?? [])
        .map((t) => `${money(Number(t.total), t.currency_code)} ${t.currency_code}`)
        .join(" · ");

    const cashIn = Number(payments?.cash_in ?? 0);

    // Se leen los totales directamente del objeto `summary` para mayor precisión
    const estimatedTotal = summary.totals.expected;

    const varianceTotal = summary.totals.variance;

    // Se transforman los objetos en arreglos para poder iterar en el JSX
    const summaryByCurrencyArray: SummaryByCurrencyItem[] = Object.entries(summary.by_currency).map(
        ([ccy, data]) => ({
            currency_code: ccy,
            opening: data.opening,
            income: data.income,
            expense: data.expense,
            change_out: data.change, // El JSON usa "change", se mapea a "change_out"
            estimated: data.expected,
        })
    );

    const closingByCurrency: ClosingByCurrencyItem[] = Object.entries(counts.closing.by_currency).map(
        ([ccy, data]) => ({
            currency_code: ccy,
            total_counted: data.total,
            lines: data.lines,
        })
    );

    const nonCashEq = (payments?.rows ?? [])
        .filter((r) => r.method !== "cash")
        .reduce((acc, r) => acc + Number(r.amount_in_sale_ccy || 0), 0);

    const exportUrl = CashShiftReportController.export.url({
        shift: Number(shift.id),
    });

    return (
        <AppLayout>
            <Head title={`Cierre de turno · ${shift.register.name}`} />

            <div className="px-6 py-5 space-y-6">
                {/* Encabezado */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">
                            Cierre de turno — {shift.register.name} · {shift.store.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Turno #{shift.id} · Estado: {shift.status.toUpperCase()} · Apertura:{" "}
                            {new Date(shift.opened_at).toLocaleString()}
                            {shift.closed_at
                                ? ` · Cierre: ${new Date(shift.closed_at).toLocaleString()}`
                                : ""}
                        </p>
                    </div>

                    <Button asChild>
                        <a href={exportUrl}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </a>
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Receipt className="w-4 h-4" /> Ventas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sales.count}</div>
                            {salesByCurrencyText && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    {salesByCurrencyText}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Efectivo (ventas)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{money(cashIn)}</div>
                            <div className="text-xs text-muted-foreground">
                                Incluye únicamente pagos con método = CASH
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <PiggyBank className="w-4 h-4" /> Cierre estimado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {money(estimatedTotal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Suma de todas las monedas (apertura + ingresos − egresos)
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Scale className="w-4 h-4" /> Variación total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${varianceTotal === 0
                                    ? ""
                                    : varianceTotal > 0
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                    }`}
                            >
                                {money(varianceTotal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Contado – Estimado
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Resumen por moneda */}
                {summaryByCurrencyArray.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Resumen por moneda</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className="w-full text-sm">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Moneda</TableHead>
                                            <TableHead className="text-right">Apertura</TableHead>
                                            <TableHead className="text-right">Ingresos</TableHead>
                                            <TableHead className="text-right">Egresos*</TableHead>
                                            <TableHead className="text-right">Devoluciones</TableHead>
                                            <TableHead className="text-right">Estimado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Se itera sobre el nuevo arreglo transformado */}
                                        {summaryByCurrencyArray.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{r.currency_code}</TableCell>
                                                <TableCell className="text-right">
                                                    {money(r.opening, r.currency_code)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {money(r.income, r.currency_code)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {money(r.expense, r.currency_code)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {money(r.change_out, r.currency_code)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {money(r.estimated, r.currency_code)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                                * Los egresos del resumen **excluyen** las devueltas; éstas se
                                reportan en su propia columna.
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pagos por método y moneda */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Pagos por método y moneda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead className="text-right"># Pagos</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-right">Eq. moneda venta</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(payments?.rows ?? []).map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="uppercase">{r.method}</TableCell>
                                            <TableCell>{r.currency_code}</TableCell>
                                            <TableCell className="text-right">{r.count}</TableCell>
                                            <TableCell className="text-right">
                                                {money(Number(r.amount || 0), r.currency_code)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {Number(r.amount_in_sale_ccy || 0).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {nonCashEq > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                                Otros métodos (eq. moneda venta): {nonCashEq.toFixed(2)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CountDetailCard
                        title="Detalle del Conteo de Apertura"
                        countData={counts.opening}
                    />
                    <CountDetailCard
                        title="Detalle del Conteo de Cierre"
                        countData={counts.closing}
                    />
                </div>
            </div>
        </AppLayout>
    );
}