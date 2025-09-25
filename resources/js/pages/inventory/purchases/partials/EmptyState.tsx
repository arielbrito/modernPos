import * as React from "react";
import { Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

export const EmptyState = React.memo(() => (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="rounded-full bg-muted p-6">
            <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">No se encontraron compras</h3>
            <p className="text-muted-foreground max-w-md">
                No hay compras que coincidan con los filtros actuales. Intenta ajustar la búsqueda o crear una nueva orden.
            </p>
        </div>
        <Button asChild className="mt-4">
            <Link href={PurchaseController.create.url()}>
                <Package className="mr-2 h-4 w-4" />
                Crear Nueva Compra
            </Link>
        </Button>
    </div>
));