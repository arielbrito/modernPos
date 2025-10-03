// resources/js/pages/inventory/purchases/partials/PurchaseTimeLine.tsx
import * as React from "react";
import type { PurchaseStatus } from "@/types";
import { CheckCircle, PackageCheck, PackagePlus, XCircle } from "lucide-react";

// Orden lógico de pasos (sin "cancelled")
const STEP_ORDER: readonly PurchaseStatus[] = [
    "draft",
    "approved",
    "partially_received",
    "received",
];

type IconCmp = React.ComponentType<{ className?: string }>;

interface TimelineStepProps {
    label: string;
    icon: IconCmp;
    isDone: boolean;
    isCurrent: boolean;
    isLast: boolean;
    isCancelled: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
    label,
    icon: Icon,
    isDone,
    isCurrent,
    isLast,
    isCancelled,
}) => {
    const textColor = isCancelled
        ? "text-red-500"
        : isDone
            ? "text-foreground"
            : "text-muted-foreground";

    const dotClasses = [
        "flex h-6 w-6 items-center justify-center rounded-full",
        isDone && !isCancelled ? "bg-primary text-primary-foreground" : "bg-muted",
        isCurrent && !isCancelled ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <>
            <div
                className={`flex items-center gap-2 ${textColor}`}
                aria-current={isCurrent && !isCancelled ? "step" : undefined}
            >
                <div className={dotClasses} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                </div>
                <span className={`text-xs ${isCurrent ? "font-semibold" : "font-medium"}`}>{label}</span>
            </div>

            {!isLast && (
                <div
                    className={`mx-4 h-px w-12 ${isDone && !isCancelled ? "bg-primary" : "bg-border"
                        }`}
                    aria-hidden="true"
                />
            )}
        </>
    );
};

export const PurchaseTimeline: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
    const isCancelled = status === "cancelled";

    // Unificamos "partially_received" y "received" como un solo paso “Recibida”
    const steps: Array<{ key: string; label: string; icon: IconCmp }> = [
        { key: "draft", label: "Creada", icon: PackagePlus },
        { key: "approved", label: "Aprobada", icon: CheckCircle },
        { key: "received", label: "Recibida", icon: PackageCheck },
    ];

    const adjustedActiveIndex =
        status === "cancelled"
            ? -1
            : status === "received" || status === "partially_received"
                ? 2
                : status === "approved"
                    ? 1
                    : 0;

    return (
        <div className="flex items-center" role="group" aria-label="Estado de la compra">
            {steps.map((step, i) => (
                <TimelineStep
                    key={step.key}
                    label={step.label}
                    icon={step.icon}
                    isDone={!isCancelled && adjustedActiveIndex >= i}
                    isCurrent={!isCancelled && adjustedActiveIndex === i}
                    isLast={i === steps.length - 1}
                    isCancelled={isCancelled}
                />
            ))}

            {isCancelled && (
                <span className="ml-4 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Cancelada
                </span>
            )}
        </div>
    );
};
