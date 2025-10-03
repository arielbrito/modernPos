import * as React from "react";
import { Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import { PurchaseTimeline } from "./PurchaseTimeLine";
import type { PurchaseStatus } from "@/types";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props { status: PurchaseStatus; }

export function PurchaseHeader({ status }: Props) {
    return (
        <div className="gradient-stoneretail rounded-lg border p-3 md:p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* <Link
                href={PurchaseController.index.url()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
            </Link> */}

            <div className="flex items-center">
                <PurchaseTimeline status={status} />
            </div>
        </div>
    );
}
