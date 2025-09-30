import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Mail, X, RotateCw, CheckCircle, Building, Hash, MapPin, Phone, Globe } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';

// --- TIPOS DE DATOS ---
// Estos tipos definen la estructura de los datos que el componente espera.
// Es una buena práctica tenerlos en un archivo centralizado como `resources/js/types/index.d.ts`

interface SaleLine {
    name: string;
    qty: number;
    unit_price: number;
    tax_amount: number;
    line_total: number;
}

interface SalePayment {
    method: string;
    amount: number;
    currency_code: string;
    tendered_amount?: number;
    change_amount?: number;
    change_currency_code?: string;
}

interface SaleCustomer {
    id: number;
    name: string;
    email?: string;
}

interface SaleData {
    id: number;
    number: string;
    currency_code: string;
    subtotal: number;
    tax_total: number;
    discount_total: number;
    total: number;
    occurred_at: string;
    customer?: SaleCustomer;
    store: { name: string };
    user: { name: string };
    lines: SaleLine[];
    payments: SalePayment[];
}

interface ReceiptSettings {
    company_name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_path?: string;
    logo_url?: string;
    footer_message?: string;
    terms_and_conditions?: string;
}

interface ReceiptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sale: SaleData | null;
    settings: ReceiptSettings | null;
}

// --- PLANTILLA DEL TICKET (SUB-COMPONENTE) ---
// Este componente es el diseño visual del ticket. Se pasa a 'useReactToPrint'.
// `forwardRef` es necesario para que 'useReactToPrint' pueda obtener una referencia a este elemento del DOM.

const ReceiptTemplate = React.forwardRef<HTMLDivElement, { sale: SaleData, settings: ReceiptSettings }>(
    ({ sale, settings }, ref) => {
        // Función de formato de moneda consistente
        const formatCurrency = (n: number | string) =>
            (Number(n || 0)).toLocaleString("es-DO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

        const formatDate = (dateString: string) => new Date(dateString).toLocaleString("es-DO");

        const totalItems = sale.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
        const lines = Array.isArray(sale?.lines) ? sale.lines : [];
        const payments = Array.isArray(sale?.payments) ? sale.payments : [];

        // --- LÓGICA MEJORADA Y CORREGIDA ---
        const cashPayment = payments.find(p => p.method === 'cash');
        // Convertimos a número INMEDIATAMENTE para evitar errores de comparación
        const totalTendered = Number(cashPayment?.tendered_amount ?? 0);
        const totalChange = Number(cashPayment?.change_amount ?? 0);
        const saleTotalNumber = Number(sale.total); // Convertimos el total de la venta a número

        return (
            <div ref={ref} className="w-[80mm] mx-auto text-[11px] font-mono text-slate-900 p-2 bg-white">
                {/* --- Encabezado de la Empresa --- */}
                <header className="text-center mb-3">
                    {settings.logo_url && (
                        <img
                            src={settings.logo_url}
                            alt="Logo de la empresa"
                            className="w-32 h-auto max-h-20 object-contain mx-auto mb-2"
                        />
                    )}
                    <h1 className="font-bold text-sm uppercase">{settings.company_name}</h1>
                    {settings.tax_id && <p className="text-[10px]">RNC: {settings.tax_id}</p>}
                    {settings.address && <p className="text-[10px]">{settings.address}</p>}
                    <div className="flex justify-center gap-3 text-[10px]">
                        {settings.phone && <p>Tel: {settings.phone}</p>}
                        {settings.website && <p>{settings.website}</p>}
                    </div>
                </header>

                <div className="border-t border-b border-dashed border-slate-500 my-2 py-1 text-[10px]">
                    <p><strong>Fecha:</strong> {formatDate(sale.occurred_at)}</p>
                    <p><strong>Recibo #:</strong> {sale.number}</p>
                    <p><strong>Cliente:</strong> {sale.customer?.name ?? 'Consumidor Final'}</p>
                    <p><strong>Cajero:</strong> {sale.user?.name ?? 'N/A'}</p>
                </div>

                {/* --- Lista de Artículos --- */}
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="border-b border-dashed border-slate-500">
                            <th className="text-left font-bold pb-1">DESCRIPCIÓN</th>
                            <th className="text-right font-bold pb-1">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.lines.map((line, idx) => (
                            <tr key={idx} className="align-top">
                                <td className="py-1">
                                    <div className="font-semibold">{line.name}</div>
                                    <div className="text-slate-600">
                                        {formatCurrency(line.qty)} x @{formatCurrency(line.unit_price)}
                                    </div>
                                </td>
                                <td className="py-1 text-right font-semibold">{formatCurrency(line.line_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* --- Totales --- */}
                <div className="border-t border-dashed border-slate-500 mt-2 pt-2 text-xs">
                    <div className="flex justify-between"><span>Subtotal:</span> <span className="font-semibold">{formatCurrency(sale.subtotal)}</span></div>
                    {sale.tax_total > 0 && <div className="flex justify-between"><span>Impuestos:</span> <span className="font-semibold">{formatCurrency(sale.tax_total)}</span></div>}
                    {sale.discount_total > 0 && <div className="flex justify-between"><span>Descuento:</span> <span className="font-semibold">-{formatCurrency(sale.discount_total)}</span></div>}
                    <div className="flex justify-between font-bold text-sm mt-1 border-t border-slate-500 pt-1">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(sale.total)} {sale.currency_code}</span>
                    </div>
                </div>

                {/* --- Pagos --- */}
                <div className="border-t border-dashed border-slate-500 mt-2 pt-2 text-xs">
                    <h2 className="font-bold text-center mb-1">DETALLE DE PAGO</h2>
                    {payments.map((p, i) => (
                        <div key={i} className="flex justify-between">
                            <span>{p.method.toUpperCase()}:</span>
                            <span className="font-semibold">{formatCurrency(p.amount)} {p.currency_code}</span>
                        </div>
                    ))}

                    {/* La condición ahora compara NÚMEROS, no cadenas de texto */}
                    {cashPayment && totalTendered > 0 && (
                        <>
                            <div className="flex justify-between mt-1 pt-1 border-t border-slate-400">
                                <span>RECIBIDO (EFECTIVO):</span>
                                <span className="font-semibold">{formatCurrency(totalTendered)} {cashPayment?.currency_code}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>CAMBIO ENTREGADO:</span>
                                <span>{formatCurrency(totalChange)} {cashPayment?.change_currency_code}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* --- Pie de Página --- */}
                <footer className="text-center mt-3 pt-2 border-t border-dashed border-slate-500 text-[10px]">
                    <p className="font-semibold">{settings.footer_message}</p>
                    <p className="mt-1 text-slate-600">{settings.terms_and_conditions}</p>
                    <p className="mt-2 text-slate-500">Total de Artículos: {totalItems}</p>
                </footer>
            </div>
        );
    }
);


// --- DIÁLOGO PRINCIPAL ---
export function ReceiptPreviewDialog({ isOpen, onClose, sale, settings }: ReceiptDialogProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);


    // Hook para la funcionalidad de impresión
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `venta-${sale?.number}`,
        bodyClass: 'bg-white', // Asegura fondo blanco al imprimir
    });

    // Función para enviar el recibo por correo
    const handleSendEmail = useCallback(() => {
        if (!sale?.id) return;
        setIsSending(true);
        router.post(`/sales/${sale.id}/send-email`, {}, {
            onSuccess: () => {
                setSent(true);
                setTimeout(() => setSent(false), 3000); // Muestra "Enviado" por 3 segundos
            },
            onError: (errors) => {
                // Muestra el primer error que devuelva el backend
                const firstError = Object.values(errors)[0];
                alert(firstError || 'Ocurrió un error al enviar el correo.');
            },
            onFinish: () => setIsSending(false),
            preserveState: true,
            preserveScroll: true,
        });
    }, [sale]);

    if (!sale || !settings) return null;

    const canSendEmail = sale.customer && sale.customer.email;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 rounded-2xl overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl font-bold">Venta Completada (#{sale.number})</DialogTitle>
                    <DialogDescription>
                        Aquí puedes imprimir el recibo o enviarlo por correo electrónico al cliente.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 max-h-[75vh]">
                    {/* Panel de Previsualización del Ticket */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 sm:p-8 overflow-y-auto">
                        <div className="shadow-lg mx-auto">
                            <ReceiptTemplate sale={sale} settings={settings} ref={receiptRef} />
                        </div>
                    </div>

                    {/* Panel de Acciones */}
                    <div className="p-6 sm:p-8 flex flex-col justify-center gap-4">
                        <h3 className="text-xl font-semibold text-center mb-4">¿Qué deseas hacer ahora?</h3>

                        <Button onClick={handlePrint} size="lg" className="w-full h-16 text-lg font-bold">
                            <Printer className="mr-3 w-6 h-6" /> Imprimir Recibo
                        </Button>

                        <Button
                            onClick={handleSendEmail}
                            size="lg"
                            className="w-full h-16 text-lg font-bold"
                            disabled={!canSendEmail || isSending || sent}
                            variant="outline"
                        >
                            {isSending && <RotateCw className="mr-3 w-6 h-6 animate-spin" />}
                            {sent && <CheckCircle className="mr-3 w-6 h-6 text-green-500" />}
                            {!isSending && !sent && <Mail className="mr-3 w-6 h-6" />}
                            {isSending ? 'Enviando...' : (sent ? '¡Enviado!' : 'Enviar por Correo')}
                        </Button>

                        {!canSendEmail && (
                            <p className="text-xs text-center text-slate-500 mt-[-8px]">
                                El cliente no tiene un email registrado para el envío.
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t">
                    <Button onClick={onClose} size="lg" className="w-full sm:w-auto font-bold">
                        <X className="mr-2 w-5 h-5" /> Cerrar y Nueva Venta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}