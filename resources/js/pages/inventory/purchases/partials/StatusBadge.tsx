import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PurchaseStatus } from "@/types";

interface Props {
    status: PurchaseStatus;
    className?: string;
}

// Mapeo de estados a clases de Tailwind y etiquetas legibles
const statusMap: Record<PurchaseStatus, { className: string; label: string }> = {
    draft: {
        className: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300",
        label: "Borrador",
    },
    approved: {
        className: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300",
        label: "Aprobado",
    },
    partially_received: {
        className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300",
        label: "Recepción Parcial",
    },
    received: {
        className: "bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-1 text-xs font-medium",
        label: "Recibido",
    },
    cancelled: {
        className: "bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-1 text-xs font-medium",
        label: "Cancelado",
    },
};

export const StatusBadge = React.memo(({ status, className }: Props) => {
    const statusInfo = statusMap[status] || statusMap.draft;

    return (
        <Badge variant="secondary" className={cn("font-medium", statusInfo.className, className)}>
            {statusInfo.label}
        </Badge>
    );
});