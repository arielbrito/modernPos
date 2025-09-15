/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { toast } from "sonner";
import { useRef, useState, useCallback, useMemo } from "react";

// --- LAYOUT & COMPONENTS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// --- ICONS ---
import {
    ArrowLeft,
    CheckCircle,
    DollarSign,
    PackageCheck,
    PackagePlus,
    XCircle,
    Paperclip,
    Upload,
    Trash2,
    Download,
    AlertTriangle,
    Clock,
    FileText
} from "lucide-react";

// --- UTILS & PARTIALS ---
import { StatusBadge } from "./partials/status-badge";
import { ReceiveModal } from "./partials/receive-modal";
import { PaymentModal } from "./partials/payment-modal";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import purchases from "@/routes/inventory/purchases";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// --- TYPESCRIPT TYPES ---
export interface Attachment {
    id: string;
    name: string;
    path: string;
    size: number;
    mime: string;
    disk?: string;
}

export interface Supplier {
    id: number;
    name: string;
}

export interface Product {
    id: number;
    code?: string;
    name: string;
    unit?: string;
}

export interface ProductVariant {
    id: number;
    sku: string;
    product?: Product;
}

export interface PurchaseItem {
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
}

export type PurchaseStatus = "draft" | "approved" | "partially_received" | "received" | "cancelled";

export interface Purchase {
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
    attachments?: Attachment[];
}

interface Props {
    purchase: Purchase;
}

interface BreadcrumbItem {
    title: string;
    href: string;
}

interface PendingItem {
    id: number;
    name: string;
    pending: number;
}

// --- CONSTANTES ---
const STEP_ORDER: readonly PurchaseStatus[] = ["draft", "approved", "partially_received", "received"];

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.xlsx,.xls,.csv,.xml,.doc,.docx,.txt";

const STATUS_COLORS: Record<PurchaseStatus, string> = {
    draft: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    partially_received: "bg-yellow-100 text-yellow-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
};

// --- UTILIDADES ---
const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const getRouteUrl = (controllerMethod: any, params: Record<string, any>) => {
    return controllerMethod.url(params);
};

// --- COMPONENTE TIMELINE MEJORADO ---
interface TimelineStepProps {
    key: string;
    label: string;
    icon: React.ReactElement;
    isDone: boolean;
    isCurrent: boolean;
    isLast: boolean;
    isCancelled: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
    label,
    icon,
    isDone,
    isCurrent,
    isLast,
    isCancelled
}) => {
    const textColor = isCancelled ? "text-red-500" : isDone ? "text-foreground" : "text-muted-foreground";
    const bgColor = isDone && !isCancelled ? "bg-primary text-primary-foreground" : "bg-muted";

    return (
        <>
            <div className={`flex items-center gap-2 ${textColor}`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${bgColor}`}>
                    <div className={`h-4 w-4 ${isDone && !isCancelled ? '' : 'text-muted-foreground'}`}>
                        {icon}
                    </div>
                </div>
                <span className={`text-xs font-medium ${isCurrent ? 'font-bold' : ''}`}>
                    {label}
                </span>
            </div>
            {!isLast && (
                <div className={`mx-4 h-px w-12 ${isDone && !isCancelled ? "bg-primary" : "bg-border"}`} />
            )}
        </>
    );
};

const PurchaseTimeline: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
    const activeIndex = STEP_ORDER.indexOf(status);
    const isCancelled = status === "cancelled";

    const steps = [
        { key: "draft", label: "Creada", icon: <PackagePlus className="h-4 w-4" /> },
        { key: "approved", label: "Aprobada", icon: <CheckCircle className="h-4 w-4" /> },
        { key: "partially_received", label: "Recepción Parcial", icon: <PackageCheck className="h-4 w-4" /> },
        { key: "received", label: "Recibida", icon: <PackageCheck className="h-4 w-4" /> },
    ];

    return (
        <div className="flex items-center">
            {steps.map((step, i) => (
                <TimelineStep
                    key={step.key}
                    label={step.label}
                    icon={step.icon}
                    isDone={!isCancelled && activeIndex >= i}
                    isCurrent={!isCancelled && activeIndex === i}
                    isLast={i === steps.length - 1}
                    isCancelled={isCancelled}
                />
            ))}
            {isCancelled && (
                <span className="ml-4 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <XCircle className="h-4 w-4" />
                    Cancelada
                </span>
            )}
        </div>
    );
};

// --- COMPONENTE DE PROGRESO DE RECEPCIÓN ---
const ReceiptProgress: React.FC<{ items: PurchaseItem[] }> = ({ items }) => {
    const totalOrdered = items.reduce((sum, item) => sum + item.qty_ordered, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.qty_received, 0);
    const progressPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso de Recepción</span>
                <span className="font-medium">{totalReceived} / {totalOrdered}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
                {progressPercentage.toFixed(1)}% completado
            </div>
        </div>
    );
};

// --- HOOK PERSONALIZADO PARA ADJUNTOS ---
// const useAttachments = (purchaseId: number) => {
//     const fileInputRef = useRef<HTMLInputElement | null>(null);
//     const [uploading, setUploading] = useState(false);
//     const [deletingId, setDeletingId] = useState<string | null>(null);

//     const triggerFileUpload = useCallback(() => {
//         fileInputRef.current?.click();
//     }, []);

//     // const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     //     const files = e.target.files;
//     //     if (!files?.length) return;

//     //     const formData = new FormData();
//     //     Array.from(files).forEach(file => formData.append('files[]', file));

//     //     setUploading(true);
//     //     router.post(
//     //         getRouteUrl(
//     //             PurchaseController.attachmentsUpload,
//     //             'inventory.purchases.attachments.upload',
//     //             { purchase: purchaseId }
//     //         ),
//     //         formData,
//     //         {
//     //             forceFormData: true,
//     //             onSuccess: () => toast.success("Adjuntos cargados correctamente."),
//     //             onError: (errors) => {
//     //                 const errorMessage = Object.values(errors).flat().join(", ") || "Error subiendo adjuntos.";
//     //                 toast.error(errorMessage);
//     //             },
//     //             onFinish: () => setUploading(false),
//     //             preserveScroll: true,
//     //         }
//     //     );

//     //     // Limpiar input
//     //     e.target.value = '';
//     // }, [purchaseId]);

//     // const removeAttachment = useCallback((attachment: Attachment) => {
//     //     setDeletingId(attachment.id);
//     //     router.delete(
//     //         getRouteUrl(
//     //             PurchaseController.attachmentsDestroy,
//     //             'inventory.purchases.attachments.destroy',
//     //             { purchase: purchaseId, attachment: attachment.id }
//     //         ),
//     //         {
//     //             onSuccess: () => toast.success("Adjunto eliminado."),
//     //             onError: () => toast.error("No se pudo eliminar el adjunto."),
//     //             onFinish: () => setDeletingId(null),
//     //             preserveScroll: true,
//     //         }
//     //     );
//     // }, [purchaseId]);

//     return {
//         fileInputRef,
//         uploading,
//         deletingId,
//         triggerFileUpload,
//         handleUpload,
//         removeAttachment
//     };
// };

// --- COMPONENTE PRINCIPAL ---
export default function Show({ purchase }: Props) {
    // --- DATOS DERIVADOS ---
    const breadcrumbs = useMemo<BreadcrumbItem[]>(() => [
        { title: "Compras", href: purchases.index.url() },
        { title: purchase.code, href: purchases.show.url({ purchase: purchase.id }) },
    ], [purchase.id, purchase.code]);

    const pendingItemsToReceive = useMemo<PendingItem[]>(() =>
        purchase.items
            .map(item => ({
                id: item.id,
                name: `${item.product?.code ? `${item.product.code} – ` : ""}${item.product?.name ?? "Producto"}`,
                pending: Math.max(0, item.qty_ordered - item.qty_received),
            }))
            .filter(item => item.pending > 0),
        [purchase.items]
    );

    const pendingMap = useMemo(() => {
        const map: Record<number, number> = {};
        purchase.items.forEach(item => {
            const pending = Math.max(0, item.qty_ordered - item.qty_received);
            if (pending > 0) map[item.id] = pending;
        });
        return map;
    }, [purchase.items]);

    // --- LÓGICA DE VISIBILIDAD ---
    const permissions = useMemo(() => ({
        canBeApproved: purchase.status === "draft",
        canBeCancelled: !["received", "partially_received", "cancelled"].includes(purchase.status),
        canReceiveItems: ["approved", "partially_received"].includes(purchase.status) && pendingItemsToReceive.length > 0,
        canMakePayment: purchase.balance_total > 0 && ["partially_received", "received"].includes(purchase.status),
        canReceiveAll: ["approved", "partially_received"].includes(purchase.status) && Object.keys(pendingMap).length > 0,
    }), [purchase.status, purchase.balance_total, pendingItemsToReceive.length, pendingMap]);

    // --- HOOK DE ADJUNTOS ---
    // const attachmentHooks = useAttachments(purchase.id);

    // --- ACCIONES ---
    const actions = useMemo(() => ({
        approve: () => {
            router.post(PurchaseController.approve.url({ purchase: purchase.id }), {}, {
                onSuccess: () => toast.success("Compra Aprobada", {
                    description: `La compra ${purchase.code} ha sido marcada como aprobada.`
                }),
                onError: () => toast.error("Error al aprobar la compra."),
                preserveState: true,
                preserveScroll: true,
            });
        },
        cancel: () => {
            router.post(PurchaseController.cancel.url({ purchase: purchase.id }), {}, {
                onSuccess: () => toast.warning("Compra Cancelada", {
                    description: `La compra ${purchase.code} ha sido cancelada.`
                }),
                onError: () => toast.error("Error al cancelar la compra."),
                preserveState: true,
                preserveScroll: true,
            });
        },
        receiveAll: () => {
            router.post(PurchaseController.receive.url({ purchase: purchase.id }),
                { items: pendingMap },
                {
                    onSuccess: () => toast.success("Se recibió todo lo pendiente."),
                    onError: () => toast.error("No se pudo registrar la recepción."),
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        }
    }), [purchase.id, purchase.code, pendingMap]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra ${purchase.code}`} />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                {/* --- ENCABEZADO --- */}
                <div className="mb-4 flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={PurchaseController.index.url()}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al listado
                        </Link>
                    </div>
                    <PurchaseTimeline status={purchase.status} />
                </div>

                {/* --- INFORMACIÓN PRINCIPAL --- */}
                <div className="grid gap-6 md:grid-cols-12">
                    <div className="md:col-span-7">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Información de la Compra
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground">Código</div>
                                    <div className="font-mono font-medium">{purchase.code}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Estado</div>
                                    <StatusBadge status={purchase.status} />
                                </div>
                                <div className="col-span-2">
                                    <div className="text-muted-foreground">Proveedor</div>
                                    <div className="font-medium">{purchase.supplier?.name}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Factura N°</div>
                                    <div className="font-medium">{purchase.invoice_number ?? "—"}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Fecha Factura</div>
                                    <div className="font-medium">{fmtDate(purchase.invoice_date) ?? "—"}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-muted-foreground">Moneda</div>
                                    <div className="font-medium">{purchase.currency} @ {purchase.exchange_rate}</div>
                                </div>
                                {purchase.items.length > 0 && (
                                    <div className="col-span-2">
                                        <ReceiptProgress items={purchase.items} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-5">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Resumen Financiero
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{money(purchase.subtotal)}</span>
                                </div>
                                {purchase.discount_total > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Descuentos</span>
                                        <span>- {money(purchase.discount_total)}</span>
                                    </div>
                                )}
                                {purchase.tax_total > 0 && (
                                    <div className="flex justify-between">
                                        <span>Impuestos</span>
                                        <span>{money(purchase.tax_total)}</span>
                                    </div>
                                )}
                                {(purchase.freight + purchase.other_costs) > 0 && (
                                    <div className="flex justify-between">
                                        <span>Flete y Otros</span>
                                        <span>{money(purchase.freight + purchase.other_costs)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-base font-semibold">
                                    <span>Total General</span>
                                    <span>{money(purchase.grand_total)}</span>
                                </div>
                                {purchase.paid_total > 0 && (
                                    <div className="flex justify-between">
                                        <span>Pagado</span>
                                        <span className="font-medium text-green-600">
                                            {money(purchase.paid_total)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex justify-between font-bold ${purchase.balance_total > 0 ? 'text-destructive' : 'text-green-600'
                                    }`}>
                                    <span>Balance Pendiente</span>
                                    <span>{money(purchase.balance_total)}</span>
                                </div>
                                {purchase.balance_total > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-orange-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>Pago pendiente</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- ADJUNTOS --- */}
                    {/* <div className="md:col-span-12">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Paperclip className="h-5 w-5" />
                                    Archivos adjuntos ({purchase.attachments?.length || 0})
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={attachmentHooks.fileInputRef}
                                        type="file"
                                        multiple
                                        accept={ACCEPTED_FILE_TYPES}
                                        className="hidden"
                                        onChange={attachmentHooks.handleUpload}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={attachmentHooks.triggerFileUpload}
                                        disabled={attachmentHooks.uploading}
                                    >
                                        <Upload className="h-4 w-4" />
                                        {attachmentHooks.uploading ? 'Subiendo...' : 'Subir archivos'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {purchase.attachments?.length ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {purchase.attachments.map(attachment => (
                                            <div key={attachment.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-medium" title={attachment.name}>
                                                        {attachment.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {attachment.mime} • {formatFileSize(attachment.size)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button asChild variant="ghost" size="icon" title="Ver / Descargar">
                                                        <a
                                                            href={getRouteUrl(
                                                                PurchaseController.attachmentsDownload,
                                                                'inventory.purchases.attachments.download',
                                                                { purchase: purchase.id, attachment: attachment.id }
                                                            )}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                title="Eliminar"
                                                                disabled={attachmentHooks.deletingId === attachment.id}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Eliminar adjunto</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ¿Seguro que deseas eliminar <strong>{attachment.name}</strong>?
                                                                    Esta acción no se puede deshacer.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => attachmentHooks.removeAttachment(attachment)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-md border-2 border-dashed p-8 text-center">
                                        <Paperclip className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <div className="mt-4 text-sm text-muted-foreground">
                                            No hay archivos adjuntos.
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={attachmentHooks.triggerFileUpload}
                                        >
                                            Subir primer archivo
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div> */}
                </div>

                {/* --- ÍTEMS Y ACCIONES --- */}
                <Card className="mt-6">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Detalle de Ítems ({purchase.items.length})</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            {permissions.canReceiveAll && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="secondary" className="gap-2">
                                            <PackageCheck className="h-4 w-4" />
                                            Recibir todo
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Recibir todo lo pendiente?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Se registrará la recepción completa de todos los ítems pendientes.
                                                Esta acción no se puede deshacer.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={actions.receiveAll}>
                                                Confirmar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {permissions.canBeApproved && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Aprobar Compra
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción marcará la compra como aprobada y permitirá recibir productos y registrar pagos.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={actions.approve}>
                                                Sí, Aprobar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {permissions.canReceiveItems && (
                                <ReceiveModal purchaseId={purchase.id} items={pendingItemsToReceive} />
                            )}

                            {permissions.canMakePayment && (
                                <PaymentModal purchaseId={purchase.id} maxAmount={purchase.balance_total} />
                            )}

                            {permissions.canBeCancelled && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="gap-2">
                                            <XCircle className="h-4 w-4" />
                                            Cancelar Compra
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer y cancelará permanentemente la orden de compra.
                                                Todos los pagos y recepciones quedarán registrados como histórico.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Volver</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={actions.cancel}
                                            >
                                                Sí, Cancelar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Producto</TableHead>
                                        <TableHead className="text-right">Cant. Ordenada</TableHead>
                                        <TableHead className="text-right">Cant. Recibida</TableHead>
                                        <TableHead className="text-right font-bold">Pendiente</TableHead>
                                        <TableHead className="text-right">Costo Unitario</TableHead>
                                        <TableHead className="text-right">Total Línea</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items.length > 0 ? (
                                        purchase.items.map((item) => {
                                            const pending = Math.max(0, item.qty_ordered - item.qty_received);
                                            const isFullyReceived = pending === 0;
                                            const isPartiallyReceived = item.qty_received > 0 && pending > 0;

                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    className={isFullyReceived ? "bg-green-50" : isPartiallyReceived ? "bg-yellow-50" : ""}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="space-y-1">
                                                            <div className="font-semibold">
                                                                {item.product_variant?.product?.name ?? "Producto no disponible"}
                                                            </div>
                                                            {item.product_variant?.sku && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    SKU: {item.product_variant.sku}
                                                                </div>
                                                            )}
                                                            {item.product?.code && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Código: {item.product.code}
                                                                </div>
                                                            )}
                                                            {item.product?.unit && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {item.product.unit}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {item.qty_ordered.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={isPartiallyReceived ? "text-yellow-600 font-medium" : isFullyReceived ? "text-green-600 font-medium" : ""}>
                                                            {item.qty_received.toLocaleString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`font-bold ${pending > 0 ? "text-orange-600" : "text-green-600"}`}>
                                                            {pending.toLocaleString()}
                                                        </span>
                                                        {pending > 0 && (
                                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                                <Clock className="h-3 w-3 text-orange-500" />
                                                                <span className="text-xs text-orange-600">Pendiente</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {money(item.unit_cost)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {money(item.line_total)}
                                                        {item.discount_amount > 0 && (
                                                            <div className="text-xs text-green-600">
                                                                Desc: -{money(item.discount_amount)}
                                                            </div>
                                                        )}
                                                        {item.tax_amount > 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Tax: +{money(item.tax_amount)}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <PackagePlus className="h-8 w-8 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        Esta compra no tiene ítems.
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Resumen de totales */}
                        {purchase.items.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <div className="w-full max-w-sm space-y-2 rounded-md border p-4">
                                    <div className="text-sm font-medium text-muted-foreground">Resumen de Ítems</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span>Total ítems:</span>
                                        <span className="font-medium text-right">{purchase.items.length}</span>

                                        <span>Cant. ordenada:</span>
                                        <span className="font-medium text-right">
                                            {purchase.items.reduce((sum, item) => sum + item.qty_ordered, 0).toLocaleString()}
                                        </span>

                                        <span>Cant. recibida:</span>
                                        <span className="font-medium text-right text-green-600">
                                            {purchase.items.reduce((sum, item) => sum + item.qty_received, 0).toLocaleString()}
                                        </span>

                                        <span>Cant. pendiente:</span>
                                        <span className={`font-medium text-right ${pendingItemsToReceive.reduce((sum, item) => sum + item.pending, 0) > 0
                                            ? "text-orange-600"
                                            : "text-green-600"
                                            }`}>
                                            {pendingItemsToReceive.reduce((sum, item) => sum + item.pending, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Alertas y notificaciones */}
                {purchase.balance_total > 0 && purchase.status === "received" && (
                    <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            <div>
                                <h3 className="text-sm font-medium text-orange-800">Pago pendiente</h3>
                                <p className="text-sm text-orange-700">
                                    Esta compra tiene un balance pendiente de <strong>{money(purchase.balance_total)}</strong>.
                                    Considera registrar un pago para completar la transacción.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {pendingItemsToReceive.length > 0 && ["approved", "partially_received"].includes(purchase.status) && (
                    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2">
                            <PackageCheck className="h-5 w-5 text-blue-600" />
                            <div>
                                <h3 className="text-sm font-medium text-blue-800">Productos pendientes de recepción</h3>
                                <p className="text-sm text-blue-700">
                                    Hay <strong>{pendingItemsToReceive.length}</strong> productos pendientes de recibir.
                                    Puedes registrar recepciones parciales o recibir todo de una vez.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}