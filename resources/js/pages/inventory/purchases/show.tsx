
import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { toast } from "sonner";

// --- LAYOUT & COMPONENTS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// --- ICONS ---
import { ArrowLeft, CheckCircle, DollarSign, PackageCheck, PackagePlus, XCircle } from "lucide-react";

// --- UTILS & PARTIALS ---
import { StatusBadge } from "./partials/status-badge";
import { ReceiveModal } from "./partials/receive-modal"; // Asumimos que este modal ya usa toasts
import { PaymentModal } from "./partials/payment-modal"; // Asumimos que este modal ya usa toasts
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import purchases from "@/routes/inventory/purchases";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { ProductVariant } from "@/types";

// --- TYPESCRIPT TYPES (sin cambios, ya estaban bien) ---
// ... (Tus tipos de Purchase, PurchaseItem, etc. van aquí)
export type Supplier = { id: number; name: string };
export type Product = { id: number; code?: string; name: string; unit?: string };
export type PurchaseItem = {
    id: number;
    product: Product;
    qty_ordered: number;
    qty_received: number;
    unit_cost: number;
    discount_pct: number;
    discount_amount: number;
    tax_pct: number;
    tax_amount: number;
    landed_cost_alloc: number;
    line_total: number;
    product_variant: ProductVariant;
};
export type PurchaseStatus = "draft" | "approved" | "partially_received" | "received" | "cancelled";
export type Purchase = {
    id: number;
    code: string;
    status: PurchaseStatus;
    supplier: Supplier;
    invoice_number?: string | null;
    invoice_date?: string | null;
    currency: string;
    exchange_rate: number;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    freight: number;
    other_costs: number;
    grand_total: number;
    paid_total: number;
    balance_total: number;
    items: PurchaseItem[];
};
interface Props { purchase: Purchase; }
type BreadcrumbItem = { title: string; href: string; };

// --- COMPONENTE TIMELINE MEJORADO ---
const stepOrder: readonly PurchaseStatus[] = ["draft", "approved", "partially_received", "received"];

function PurchaseTimeline({ status }: { status: PurchaseStatus }) {
    const activeIndex = stepOrder.indexOf(status);
    const isCancelled = status === "cancelled";

    const steps = [
        { key: "draft", label: "Creada", icon: <PackagePlus className="h-4 w-4" /> },
        { key: "approved", label: "Aprobada", icon: <CheckCircle className="h-4 w-4" /> },
        { key: "partially_received", label: "Recepción Parcial", icon: <PackageCheck className="h-4 w-4" /> },
        { key: "received", label: "Recibida", icon: <PackageCheck className="h-4 w-4" /> },
    ];

    return (
        <div className="flex items-center">
            {steps.map((step, i) => {
                const isDone = !isCancelled && activeIndex >= i;
                const isCurrent = !isCancelled && activeIndex === i;
                const color = isCancelled ? "text-red-500" : isDone ? "text-foreground" : "text-muted-foreground";

                return (
                    <React.Fragment key={step.key}>
                        <div className={`flex items-center gap-2 ${color}`}>
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isDone && !isCancelled ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                {React.cloneElement(step.icon, { className: `h-4 w-4 ${isDone ? '' : 'text-muted-foreground'}` })}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'font-bold' : ''}`}>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`mx-4 h-px w-12 ${isDone && !isCancelled ? "bg-primary" : "bg-border"}`} />}
                    </React.Fragment>
                );
            })}
            {isCancelled && <span className="ml-4 flex items-center gap-2 text-sm font-semibold text-red-600"><XCircle className="h-4 w-4" /> Cancelada</span>}
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function Show({ purchase }: Props) {
    // --- BREADCRUMBS Y DATOS DERIVADOS (MEMOIZADOS) ---
    const breadcrumbs = React.useMemo<BreadcrumbItem[]>(() => [
        { title: "Compras", href: purchases.index.url() },
        { title: purchase.code, href: purchases.show.url({ purchase: purchase.id }) },
    ], [purchase.id, purchase.code]);

    const pendingItemsToReceive = React.useMemo(() =>
        purchase.items
            .map(it => ({
                id: it.id,
                name: `${it.product?.code ? it.product.code + " – " : ""}${it.product?.name ?? "Producto"}`,
                pending: Math.max(0, it.qty_ordered - it.qty_received),
            }))
            .filter(p => p.pending > 0),
        [purchase.items]
    );

    // --- LÓGICA DE VISIBILIDAD DE ACCIONES ---
    const canBeApproved = purchase.status === "draft";
    const canBeCancelled = !["received", "partially_received", "cancelled"].includes(purchase.status);
    const canReceiveItems = ["approved", "partially_received"].includes(purchase.status) && pendingItemsToReceive.length > 0;
    const canMakePayment = purchase.balance_total > 0 && ["partially_received", "received"].includes(purchase.status);

    // --- ACCIONES (MEMOIZADAS Y CON FEEDBACK MODERNO) ---
    const approveAction = React.useCallback(() => {
        router.post(PurchaseController.approve.url({ purchase: purchase.id }), {}, {
            onSuccess: () => toast.success("Compra Aprobada", { description: `La compra ${purchase.code} ha sido marcada como aprobada.` }),
            onError: () => toast.error("Error al aprobar"),
            preserveState: true,
            preserveScroll: true,
        });
    }, [purchase.id, purchase.code]);

    const cancelAction = React.useCallback(() => {
        router.post(PurchaseController.cancel.url({ purchase: purchase.id }), {}, {
            onSuccess: () => toast.warning("Compra Cancelada", { description: `La compra ${purchase.code} ha sido cancelada.` }),
            onError: () => toast.error("Error al cancelar"),
            preserveState: true,
            preserveScroll: true,
        });
    }, [purchase.id, purchase.code]);



    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra ${purchase.code}`} />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <div className="mb-4 flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={PurchaseController.index.url()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" /> Volver al listado
                        </Link>
                    </div>
                    <PurchaseTimeline status={purchase.status} />
                </div>

                {/* --- SECCIÓN DE INFORMACIÓN PRINCIPAL --- */}
                <div className="grid gap-6 md:grid-cols-5">
                    <div className="md:col-span-3">
                        <Card>
                            <CardHeader><CardTitle>Encabezado de la Compra</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                <div><div className="text-muted-foreground">Código</div><div className="font-mono font-medium">{purchase.code}</div></div>
                                <div><div className="text-muted-foreground">Estado</div><StatusBadge status={purchase.status} /></div>
                                <div className="col-span-2"><div className="text-muted-foreground">Proveedor</div><div className="font-medium">{purchase.supplier?.name}</div></div>
                                <div><div className="text-muted-foreground">Factura N°</div><div className="font-medium">{purchase.invoice_number ?? "—"}</div></div>
                                <div><div className="text-muted-foreground">Fecha Factura</div><div className="font-medium">{fmtDate(purchase.invoice_date) ?? "—"}</div></div>
                                <div><div className="text-muted-foreground">Moneda</div><div className="font-medium">{purchase.currency} @ {purchase.exchange_rate}</div></div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Resumen Financiero</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{money(purchase.subtotal)}</span></div>
                                <div className="flex justify-between"><span>Descuentos</span><span>- {money(purchase.discount_total)}</span></div>
                                <div className="flex justify-between"><span>Impuestos</span><span>{money(purchase.tax_total)}</span></div>
                                <div className="flex justify-between"><span>Flete y Otros</span><span>{money(purchase.freight + purchase.other_costs)}</span></div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-base font-semibold"><span>Total General</span><span>{money(purchase.grand_total)}</span></div>
                                <div className="flex justify-between"><span>Pagado</span><span className="font-medium text-green-600">{money(purchase.paid_total)}</span></div>
                                <div className={`flex justify-between font-bold ${purchase.balance_total > 0 ? 'text-destructive' : ''}`}>
                                    <span>Balance Pendiente</span>
                                    <span>{money(purchase.balance_total)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- SECCIÓN DE ÍTEMS Y ACCIONES --- */}
                <Card className="mt-6">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Detalle de Ítems</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            {canBeApproved && <AlertDialog><AlertDialogTrigger asChild><Button className="gap-1"><CheckCircle className="h-4 w-4" /> Aprobar Compra</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle><AlertDialogDescription>Esta acción marcará la compra como aprobada y permitirá recibir productos y registrar pagos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={approveAction}>Sí, Aprobar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                            {canReceiveItems && <ReceiveModal purchaseId={purchase.id} items={pendingItemsToReceive} />}
                            {canMakePayment && <PaymentModal purchaseId={purchase.id} maxAmount={purchase.balance_total} />}
                            {canBeCancelled && <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="gap-1"><XCircle className="h-4 w-4" /> Cancelar Compra</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer y cancelará permanentemente la orden de compra.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={cancelAction}>Sí, Cancelar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cant. Ordenada</TableHead><TableHead className="text-right">Cant. Recibida</TableHead><TableHead className="text-right font-bold">Pendiente</TableHead><TableHead className="text-right">Costo Unitario</TableHead><TableHead className="text-right">Total Línea</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {purchase.items.length > 0 ? purchase.items.map((it) => (
                                        <TableRow key={it.id}>
                                            <TableCell className="font-medium">
                                                <div className="font-semibold">{it.product_variant?.product?.name ?? "Producto no disponible"}</div>
                                                <div className="text-xs text-muted-foreground">{it.product_variant?.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{it.qty_ordered}</TableCell>
                                            <TableCell className="text-right">{it.qty_received}</TableCell>
                                            <TableCell className="text-right font-bold">{Math.max(0, it.qty_ordered - it.qty_received)}</TableCell>
                                            <TableCell className="text-right">{money(it.unit_cost)}</TableCell>
                                            <TableCell className="text-right">{money(it.line_total)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">Esta compra no tiene ítems.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}