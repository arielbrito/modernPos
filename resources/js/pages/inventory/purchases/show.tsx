import * as React from "react";
import { Head } from "@inertiajs/react";

// --- LAYOUT & HOOKS ---
import AppLayout from "@/layouts/app-layout";
import { usePurchaseDetails } from "./hooks/usePurchaseDetails";
import { useAttachments } from "./hooks/useAttachments";

// --- PARTIALS (SUB-COMPONENTES) ---
import { PurchaseHeader } from "./partials/PurchaseHeader";
import { PurchaseInfoCard } from "./partials/PurchaseInfoCard";
import { FinancialSummaryCard } from "./partials/FinancialSummaryCard";
import { AttachmentsCard } from "./partials/AttachmentsCard";
import { PurchaseItemsTable } from "./partials/PurchaseItemsTable";
import { PurchaseAlerts } from "./partials/PurchaseAlerts ";
import { PurchaseReturnsCard } from "./partials/PurchaseReturnsCard";

// --- TYPES ---
import type { Purchase } from "@/types";

interface Props {
    purchase: Purchase;
    can: { // <-- Recibimos la nueva prop
        update: boolean;
    }
}

export default function ShowPurchase({ purchase, can }: Props) {
    // 1. Toda la lógica compleja vive en estos hooks.
    const {
        breadcrumbs,
        pendingItemsList,
        permissions,
        actions,
    } = usePurchaseDetails(purchase);

    const attachmentLogic = useAttachments(purchase.id);

    // 2. El JSX es ahora un "orquestador" limpio de componentes presentacionales.
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra ${purchase.code}`} />

            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">

                <PurchaseHeader status={purchase.status} />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7 space-y-6">
                        <PurchaseInfoCard purchase={purchase} />
                        <AttachmentsCard
                            attachments={purchase.attachments || []}
                            {...attachmentLogic}
                        />
                    </div>
                    <div className="md:col-span-5">
                        <FinancialSummaryCard purchase={purchase} />
                    </div>
                </div>

                <PurchaseItemsTable
                    purchase={purchase}
                    permissions={permissions}
                    actions={actions}
                    pendingItemsList={pendingItemsList}
                    balanceTotal={purchase.balance_total}
                    canUpdate={can.update} />
                <PurchaseReturnsCard returns={purchase.returns || []} />

                <PurchaseAlerts
                    purchase={purchase}
                    pendingItemsCount={pendingItemsList.length}
                />
            </div>
        </AppLayout>
    );
}