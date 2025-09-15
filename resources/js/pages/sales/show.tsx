/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useMemo, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer, Receipt, FileDown, Copy } from "lucide-react";
import { toast } from "sonner";

// Wayfinder helpers
import SaleController from "@/actions/App/Http/Controllers/Sales/SaleController";
import SalePrintController from "@/actions/App/Http/Controllers/Sales/SalePrintController";

// Tipos mejorados
interface SaleLine {
    id: string;
    sku?: string;
    name: string;
    qty: number | string;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    tax_rate?: number;
    line_total: number;
}

interface Payment {
    id: string;
    method: string;
    currency_code: string;
    amount: number;
    fx_rate_to_sale?: number | null; // Puede ser null
    reference?: string;
    tendered_amount?: number | null; // Puede ser null
    change_amount?: number | null; // Puede ser null
    change_currency_code?: string | null; // Puede ser null
}

interface Sale {
    id: string;
    number: string;
    occurred_at?: string;
    currency_code?: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    total: number;
    ncf_number?: string;
    ncf_type?: string;
    bill_to_name?: string;
    bill_to_doc_type?: string;
    bill_to_doc_number?: string;
    bill_to_is_taxpayer?: boolean;
    store?: { name: string };
    register?: { name: string };
    user?: { name: string };
    lines?: SaleLine[];
    payments?: Payment[];
}

type Props = {
    sale: Sale;
};

// Constantes
const DEFAULT_CURRENCY = "DOP";
const PAYMENT_METHODS = {
    cash: "EFECTIVO",
    card: "TARJETA",
    transfer: "TRANSFERENCIA",
    check: "CHEQUE"
} as const;

const formatMoneyByCurrency = (amount: number | null | undefined, currencyCode: string | null | undefined) => {
    const num = Number(amount || 0);
    const ccy = currencyCode || DEFAULT_CURRENCY;
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: ccy,
        minimumFractionDigits: 2
    }).format(num);
};

// Hooks personalizados
const useCurrencyFormatter = (currencyCode: string = DEFAULT_CURRENCY) => {
    return useMemo(() => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 2
        });
    }, [currencyCode]);
};

const useDateFormatter = () => {
    return useCallback((dateString?: string) => {
        if (!dateString) return "—";
        try {
            return new Date(dateString).toLocaleString("es-DO", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return "Fecha inválida";
        }
    }, []);
};

// Componentes auxiliares
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="text-sm text-muted-foreground text-center p-4">
        {message}
    </div>
);

export default function SaleShow({ sale }: Props) {
    // Validación temprana
    if (!sale) {
        return (
            <AppLayout>
                <Head title="Venta no encontrada" />
                <div className="max-w-5xl mx-auto p-6">
                    <EmptyState message="No se encontró la venta solicitada." />
                </div>
            </AppLayout>
        );
    }

    // Hooks
    const currencyFormatter = useCurrencyFormatter(sale.currency_code);
    const formatDate = useDateFormatter();

    // Funciones de formateo memoizadas
    const formatMoney = useCallback((amount: number | string) => {
        const num = Number(amount || 0);
        return isNaN(num) ? "—" : currencyFormatter.format(num);
    }, [currencyFormatter]);

    // Cálculos memoizados
    const calculations = useMemo(() => {
        const lines = sale.lines ?? [];
        const payments = sale.payments ?? [];
        const saleCcy = sale.currency_code || DEFAULT_CURRENCY;

        const itemsCount = lines.reduce((acc, line) => acc + Number(line.qty || 0), 0);

        // --- LÓGICA DE CONVERSIÓN APLICADA AQUÍ ---

        const totalPaid = payments.reduce((acc, p) => {
            const rate = p.currency_code !== saleCcy ? (p.fx_rate_to_sale || 1) : 1;
            return acc + (Number(p.amount) * rate);
        }, 0);

        const cashPayments = payments.filter(p => p.method === "cash");

        const cashReceived = cashPayments.reduce((acc, p) => {
            const rate = p.currency_code !== saleCcy ? (p.fx_rate_to_sale || 1) : 1;
            return acc + (Number(p.tendered_amount || 0) * rate);
        }, 0);

        const cashChange = cashPayments.reduce((acc, p) => {
            // El cambio ya debería estar en su propia moneda, lo convertimos si no es la moneda de la venta
            const changeCcy = p.change_currency_code || p.currency_code;
            const rate = changeCcy !== saleCcy ? (p.fx_rate_to_sale || 1) : 1;
            return acc + (Number(p.change_amount || 0) * (changeCcy === p.currency_code ? rate : 1));
        }, 0);

        return {
            itemsCount,
            totalPaid,
            cashReceived,
            cashChange,
            linesCount: lines.length
        };
    }, [sale]);
    // Datos derivados memoizados
    const derivedData = useMemo(() => {
        const documentInfo = sale.bill_to_doc_type === "NONE" || !sale.bill_to_doc_type
            ? "—"
            : `${sale.bill_to_doc_type} ${sale.bill_to_doc_number || ""}`.trim();

        const customerType = sale.bill_to_is_taxpayer ? "Contribuyente" : "Consumidor Final";
        const customerName = sale.bill_to_name || "Consumidor Final";

        return {
            documentInfo,
            customerType,
            customerName
        };
    }, [sale.bill_to_doc_type, sale.bill_to_doc_number, sale.bill_to_is_taxpayer, sale.bill_to_name]);

    // Event handlers con manejo de errores
    const handleBack = useCallback(() => {
        try {
            router.visit(SaleController.index.url());
        } catch (error) {
            console.error("Error navigating back:", error);
            toast.error("No se pudo navegar hacia atrás.",);
        }
    }, []);

    const handlePrint = useCallback(() => {
        try {
            window.open(
                SalePrintController.print.url({ sale: Number(sale.id) }),
                "_blank",
                "noopener,noreferrer"
            );
        } catch (error) {
            console.error("Error opening print window:", error);
            toast.error("No se pudo abrir la ventana de impresión.");
        }
    }, [sale.id]);

    const handleExportPDF = useCallback(() => {
        try {
            window.open(
                SalePrintController.pdf.url({ sale: Number(sale.id) }),
                "_blank",
                "noopener,noreferrer"
            );
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast.error("No se pudo exportar el PDF.");
        }
    }, [sale.id]);

    const handleCopyNumber = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(sale.number);
            toast.success("Número de venta copiado al portapapeles.");
        } catch (error) {
            console.error("Error copying to clipboard:", error);
            toast.error("No se pudo copiar al portapapeles.");
        }
    }, [sale.number]);

    // Función para obtener el nombre del método de pago
    const getPaymentMethodName = (method: string) => {
        return PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] || method.toUpperCase();
    };

    return (
        <AppLayout>
            <Head title={`Venta ${sale.number}`} />

            <div className="max-w-5xl mx-auto p-6 space-y-6">
                {/* Header mejorado */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">Venta {sale.number}</h1>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyNumber}
                                className="h-6 w-6 p-0"
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {sale.store?.name ?? "—"} · {formatDate(sale.occurred_at)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                        </Button>
                        <Button onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Imprimir
                        </Button>
                        <Button variant="secondary" onClick={handleExportPDF}>
                            <FileDown className="w-4 h-4 mr-2" /> PDF
                        </Button>
                    </div>
                </div>

                {/* Cards de resumen mejorados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="font-medium">{derivedData.customerName}</div>
                            <div className="text-sm text-muted-foreground">
                                Identificación: {derivedData.documentInfo}
                            </div>
                            <Badge variant={sale.bill_to_is_taxpayer ? "default" : "secondary"}>
                                {derivedData.customerType}
                            </Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Información Fiscal</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <div>NCF: <span className="font-medium">{sale.ncf_number ?? "—"}</span></div>
                            <div>Tipo: <span className="font-medium">{sale.ncf_type ?? "—"}</span></div>
                            <div>No.: <span className="font-medium">{sale.number}</span></div>
                            <div>Caja: <span className="font-medium">{sale.register?.name ?? "—"}</span></div>
                            <div>Vendedor: <span className="font-medium">{sale.user?.name ?? "—"}</span></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Totales</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatMoney(sale.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Descuentos</span>
                                <span className="text-red-600">-{formatMoney(sale.discount_total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Impuestos</span>
                                <span>{formatMoney(sale.tax_total)}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-semibold text-base">
                                <span>Total</span>
                                <span>{formatMoney(sale.total)} {sale.currency_code ?? DEFAULT_CURRENCY}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla de productos mejorada */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Productos</span>
                            <Badge variant="outline">
                                {calculations.linesCount} productos · {calculations.itemsCount.toFixed(2)} unidades
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!sale.lines || sale.lines.length === 0 ? (
                            <EmptyState message="No hay productos en esta venta." />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Cant.</TableHead>
                                            <TableHead className="text-right">Precio Unit.</TableHead>
                                            <TableHead className="text-right">Desc.</TableHead>
                                            <TableHead className="text-right">Impuesto</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.lines.map((line) => (
                                            <TableRow key={line.id}>
                                                <TableCell className="whitespace-nowrap font-mono text-xs">
                                                    {line.sku || "—"}
                                                </TableCell>
                                                <TableCell className="max-w-[300px]">
                                                    <div className="truncate" title={line.name}>
                                                        {line.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(line.qty).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatMoney(line.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {line.discount_amount > 0 ? (
                                                        <span className="text-red-600">
                                                            -{formatMoney(line.discount_amount)}
                                                        </span>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {line.tax_amount > 0 ? (
                                                        <div className="text-right">
                                                            <div>{formatMoney(line.tax_amount)}</div>
                                                            {line.tax_rate && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    ({(Number(line.tax_rate) * 100).toFixed(0)}%)
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatMoney(line.line_total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sección de pagos mejorada */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Pagos</span>
                            <Badge variant="outline">{sale.payments?.length || 0} pagos</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!sale.payments || sale.payments.length === 0 ? (
                            <EmptyState message="Sin pagos registrados." />
                        ) : (
                            <>
                                {sale.payments.map((payment) => (
                                    <div key={payment.id} className="flex flex-wrap items-center justify-between text-sm border-b pb-2 last:border-b-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline">{getPaymentMethodName(payment.method)}</Badge>
                                            <span className="text-muted-foreground">{payment.currency_code}</span>
                                            {payment.fx_rate_to_sale && (
                                                <span className="text-muted-foreground text-xs">FX: {payment.fx_rate_to_sale}</span>
                                            )}
                                            {payment.reference && (
                                                <span className="text-muted-foreground text-xs">Ref: {payment.reference}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {/* --- CORRECCIONES DE FORMATO AQUÍ --- */}
                                            <span>Monto: <strong>{formatMoneyByCurrency(payment.amount, payment.currency_code)}</strong></span>
                                            {payment.method === "cash" && (
                                                <>
                                                    <span>Recibido: <strong>{formatMoneyByCurrency(payment.tendered_amount, payment.currency_code)}</strong></span>
                                                    <span>Cambio: <strong>{formatMoneyByCurrency(payment.change_amount, payment.change_currency_code)}</strong></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex items-center justify-end gap-6 text-sm bg-muted/30 p-3 rounded">
                                    {/* Estos totales ahora son correctos porque `calculations` fue corregido */}
                                    <span>Total pagado: <strong className="text-green-600">{formatMoney(calculations.totalPaid)}</strong></span>
                                    {calculations.cashReceived > 0 && (
                                        <span>Efectivo recibido: <strong>{formatMoney(calculations.cashReceived)}</strong></span>
                                    )}
                                    {calculations.cashChange > 0 && (
                                        <span>Cambio: <strong>{formatMoney(calculations.cashChange)}</strong></span>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Footer con acciones */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <Button onClick={handlePrint}>
                        <Receipt className="w-4 h-4 mr-2" /> Imprimir recibo
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}