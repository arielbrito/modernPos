import * as React from "react";
import { Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import { PurchaseTimeline } from "./PurchaseTimeLine"; // Asumiendo que extraes el Timeline aquí
import type { PurchaseStatus } from "@/types";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    status: PurchaseStatus;
}

export function PurchaseHeader({ status }: Props) {
    return (
        <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href={PurchaseController.index.url()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Volver al listado
            </Link>
            <PurchaseTimeline status={status} />
        </div>
    );
}