import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import StoreController from "@/actions/App/Http/Controllers/Settings/StoreController";

export function DeleteStoreDialog({ open, onOpenChange, storeId }: { open: boolean; onOpenChange: (v: boolean) => void; storeId: number | null; }) {
    const remove = () => {
        if (!storeId) return;
        router.delete(StoreController.destroy.url({ store: storeId }), {
            onSuccess: () => { toast.success("Proveedor eliminado"); onOpenChange(false); },
            onError: () => toast.error("No se pudo eliminar"),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Desactivar tienda</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Esta acción desactivara esta tienda.</p>
                <DialogFooter>
                    <Button variant="destructive" onClick={remove}>Desactivar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
