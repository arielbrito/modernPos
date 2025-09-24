import * as React from "react";
import type { PurchaseStatus } from "@/types";
import { CheckCircle, PackageCheck, PackagePlus, XCircle } from "lucide-react";

// The order of the steps in the timeline
const STEP_ORDER: readonly PurchaseStatus[] = ["draft", "approved", "partially_received", "received"];

// The definition for a single step in the timeline
interface TimelineStepProps {
    label: string;
    icon: React.ReactElement;
    isDone: boolean;
    isCurrent: boolean;
    isLast: boolean;
    isCancelled: boolean;
}

// The visual component for a single step
const TimelineStep: React.FC<TimelineStepProps> = ({ label, icon, isDone, isCurrent, isLast, isCancelled }) => {
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

// The main exportable component that builds the timeline
export const PurchaseTimeline: React.FC<{ status: PurchaseStatus }> = ({ status }) => {
    const activeIndex = STEP_ORDER.indexOf(status);
    const isCancelled = status === "cancelled";

    const steps = [
        { key: "draft", label: "Creada", icon: <PackagePlus className="h-4 w-4" /> },
        { key: "approved", label: "Aprobada", icon: <CheckCircle className="h-4 w-4" /> },
        // We can combine the logic for partial and full reception for a cleaner timeline
        { key: "received", label: "Recibida", icon: <PackageCheck className="h-4 w-4" /> },
    ];

    // Adjust active index for combined 'received' step
    const adjustedActiveIndex = status === 'partially_received' ? 2 : activeIndex;

    return (
        <div className="flex items-center">
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
                    <XCircle className="h-4 w-4" />
                    Cancelada
                </span>
            )}
        </div>
    );
};