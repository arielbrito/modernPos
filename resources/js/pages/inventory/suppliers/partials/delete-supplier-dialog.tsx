import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import SupplierController from "@/actions/App/Http/Controllers/Inventory/SupplierController";

export function DeleteSupplierDialog({ open, onOpenChange, supplierId }: { open: boolean; onOpenChange: (v: boolean) => void; supplierId: number | null; }) {
    const remove = () => {
        if (!supplierId) return;
        router.delete(SupplierController.destroy.url({ supplier: supplierId }), {
            onSuccess: () => { toast.success("Proveedor eliminado"); onOpenChange(false); },
            onError: () => toast.error("No se pudo eliminar"),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Eliminar proveedor</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
                <DialogFooter>
                    <Button variant="destructive" onClick={remove}>Eliminar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
