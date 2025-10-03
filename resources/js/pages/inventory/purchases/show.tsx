import * as React from "react";
import { Head, Link } from "@inertiajs/react";

// LAYOUT & HOOKS
import AppLayout from "@/layouts/app-layout";
import { usePurchaseDetails } from "./hooks/usePurchaseDetails";
import { useAttachments } from "./hooks/useAttachments";

// PARTIALS
import { PurchaseHeader } from "./partials/PurchaseHeader";
import { PurchaseInfoCard } from "./partials/PurchaseInfoCard";
import { FinancialSummaryCard } from "./partials/FinancialSummaryCard";
import { AttachmentsCard } from "./partials/AttachmentsCard";
import { PurchaseItemsTable } from "./partials/PurchaseItemsTable";
import { PurchaseAlerts } from "./partials/PurchaseAlerts";
import { PurchaseReturnsCard } from "./partials/PurchaseReturnsCard";
import { ReceiveModal } from "./partials/receive-modal";
import { PaymentModal } from "./partials/payment-modal";
import { ReturnModal } from "./partials/ReturnModal";
import { StatusBadge } from "./partials/status-badge";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ICONS & UTILS
import { ArrowLeft, CheckCircle, Pencil, XCircle, Undo2 } from "lucide-react";
import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { PrintControls } from "./partials/show/PrintControls";
import { ExportButtons } from "./partials/show/ExportButtons";
import { EmailPurchaseModal } from "./partials/show/email-purchase-modal";

/* ---------- Reusables ---------- */
function Kpi({
    label,
    value,
    hint,
    accent,
}: {
    label: string;
    value: React.ReactNode;
    hint?: string;
    accent?: "danger" | "success" | "muted";
}) {
    const tone =
        accent === "danger"
            ? "text-destructive"
            : accent === "success"
                ? "text-green-600"
                : "text-foreground";
    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={`mt-1 text-xl font-semibold leading-tight ${tone}`}>{value}</div>
                {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
            </CardContent>
        </Card>
    );
}

/* ---------- Top Action Bar (desktop) ---------- */
function StickyActionBar({
    purchase,
    permissions,
    pendingItemsList,
    canUpdate,
    onApprove,
    onCancel,
}: {
    purchase: Purchase;
    permissions: Record<string, boolean>;
    pendingItemsList: Array<{ id: number; name: string; pending: number }>;
    canUpdate: boolean;
    onApprove: () => void;
    onCancel: () => void;
}) {
    const balance = toNum(purchase.balance_total);

    return (
        <div className="sticky top-0 z-30 hidden md:block bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="mx-auto max-w-7xl px-1 py-2 flex  items-center justify-between">
                <div className="flex items-center gap-4 mr-2">
                    <Link
                        href={PurchaseController.index.url()}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-3">
                        <div className="text-lg font-bold tracking-tight">Compra {purchase.code}</div>
                        <StatusBadge status={purchase.status} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2  ">
                    {permissions.canBeApproved && (
                        <Button className="gap-2" onClick={onApprove}>
                            <CheckCircle className="h-4 w-4" /> Aprobar
                        </Button>
                    )}
                    {permissions.canReceiveItems && (
                        <ReceiveModal purchaseId={purchase.id} items={pendingItemsList} />
                    )}
                    {permissions.canMakePayment && (
                        <PaymentModal purchaseId={purchase.id} maxAmount={balance} />
                    )}
                    {["partially_received", "received"].includes(purchase.status) && (
                        <ReturnModal purchase={purchase} />
                    )}
                    {purchase.status === "draft" && canUpdate && (
                        <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href={PurchaseController.edit.url({ purchase: purchase.id })}>
                                <Pencil className="h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                    )}
                    {permissions.canBeCancelled && (
                        <Button variant="destructive" className="gap-2" onClick={onCancel}>
                            <XCircle className="h-4 w-4" />
                            Cancelar
                        </Button>
                    )}

                </div>



            </div>
        </div>
    );
}

/* ---------- Bottom Action Bar (mobile) ---------- */
function MobileActions({
    purchase,
    permissions,
    pendingItemsList,
    onApprove,
    onCancel,
}: {
    purchase: Purchase;
    permissions: Record<string, boolean>;
    pendingItemsList: Array<{ id: number; name: string; pending: number }>;
    onApprove: () => void;
    onCancel: () => void;
}) {
    const balance = toNum(purchase.balance_total);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-2 grid grid-cols-2 gap-2">
                {permissions.canBeApproved ? (
                    <Button size="sm" onClick={onApprove} className="gap-2">
                        <CheckCircle className="h-4 w-4" /> Aprobar
                    </Button>
                ) : permissions.canReceiveItems ? (
                    <ReceiveModal purchaseId={purchase.id} items={pendingItemsList} />
                ) : (
                    <Button size="sm" variant="outline" disabled>
                        —
                    </Button>
                )}

                {permissions.canMakePayment ? (
                    <PaymentModal purchaseId={purchase.id} maxAmount={balance} />
                ) : ["partially_received", "received"].includes(purchase.status) ? (
                    <ReturnModal purchase={purchase} />
                ) : permissions.canBeCancelled ? (
                    <Button size="sm" variant="destructive" onClick={onCancel} className="gap-2">
                        <XCircle className="h-4 w-4" /> Cancelar
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" disabled>
                        —
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ---------- Page ---------- */
interface Props {
    purchase: Purchase;
    can?: { update: boolean };
}

export default function ShowPurchase({ purchase, can }: Props) {
    const { breadcrumbs, pendingItemsList, permissions, actions } = usePurchaseDetails(purchase);
    const attachmentLogic = useAttachments(purchase.id);

    const safeAttachments = (purchase.attachments ?? []) as NonNullable<typeof purchase.attachments>;
    const safeReturns = (purchase.returns ?? []) as NonNullable<typeof purchase.returns>;
    const canUpdate = Boolean(can?.update);

    // KPIs
    const itemsCount = purchase.items.length;
    const ordered = purchase.items.reduce((s, it) => s + toNum(it.qty_ordered), 0);
    const received = purchase.items.reduce((s, it) => s + toNum(it.qty_received), 0);
    const progressPct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    const balance = toNum(purchase.balance_total);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra ${purchase.code}`} />

            {/* Desktop action bar */}
            <StickyActionBar
                purchase={purchase}
                permissions={permissions}
                pendingItemsList={pendingItemsList}
                canUpdate={canUpdate}
                onApprove={actions.approve}
                onCancel={actions.cancel}
            />


            {/* Mobile actions fixed bottom */}
            <MobileActions
                purchase={purchase}
                permissions={permissions}
                pendingItemsList={pendingItemsList}
                onApprove={actions.approve}
                onCancel={actions.cancel}
            />


            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6 pb-20 md:pb-6">
                {/* HERO / Timeline */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <PurchaseHeader status={purchase.status} />
                    <div className="flex flex-wrap gap-2">
                        <PrintControls purchaseId={purchase.id} />
                        <ExportButtons purchaseId={purchase.id} />
                        <EmailPurchaseModal purchase={purchase} />
                    </div>
                </div>

                {/* KPIs: 1 col (xs), 2 col (sm/md), 4 col (lg+) */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi label="Ítems" value={itemsCount} />
                    <Kpi
                        label="Recepción"
                        value={`${received.toLocaleString()} / ${ordered.toLocaleString()}`}
                        hint={`${progressPct}% completado`}
                    />
                    <Kpi label="Balance Pendiente" value={money(balance)} accent={balance > 0 ? "danger" : "success"} />
                    <Kpi
                        label="Devoluciones"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Undo2 className="h-4 w-4 opacity-60" /> {safeReturns.length}
                            </span>
                        }
                        accent="muted"
                    />
                </div>

                {/* Main responsive layout:
            - md+: grid 12 cols, sidebar sticky a la derecha (4 cols)
            - xl: sidebar 4 cols, contenido 8 cols
            - mobile: flujo vertical  */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Content column */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Ítems a todo el ancho para mejor legibilidad */}
                        <PurchaseItemsTable
                            purchase={purchase}
                            permissions={permissions}
                            actions={actions}
                            pendingItemsList={pendingItemsList}
                            balanceTotal={balance}
                            canUpdate={canUpdate}
                        />

                        {/* Devoluciones e Indicadores */}
                        <PurchaseReturnsCard returns={safeReturns} />
                        <PurchaseAlerts purchase={purchase} pendingItemsCount={pendingItemsList.length} />
                    </div>

                    {/* Sticky Sidebar (Info + Totales + Adjuntos) */}
                    <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-[64px] self-start">
                        <PurchaseInfoCard purchase={purchase} />
                        <FinancialSummaryCard purchase={purchase} />
                        <AttachmentsCard attachments={safeAttachments} {...attachmentLogic} />
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
