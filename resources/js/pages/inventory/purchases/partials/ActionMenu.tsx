import * as React from "react";
import { Link } from "@inertiajs/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, CheckCircle, XCircle, MoreVertical, Loader2 } from "lucide-react";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions"; // Importamos el hook de acciones
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchase: Purchase;
    actions: ReturnType<typeof usePurchaseActions>;
}

export const ActionMenu = React.memo(({ purchase, actions }: Props) => {
    const { approvePurchase, cancelPurchase, loadingStates } = actions;
    const isApproving = loadingStates.approving === purchase.id;
    const isCancelling = loadingStates.cancelling === purchase.id;
    const isLoading = isApproving || isCancelling;

    const canApprove = purchase.status === "draft";
    const canCancel = !["received", "partially_received", "cancelled"].includes(purchase.status);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={PurchaseController.show.url({ purchase: purchase.id })}>
                        <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                    </Link>
                </DropdownMenuItem>
                {canApprove && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogDescription>Esta acción marcará la compra como aprobada y no se podrá editar.</AlertDialogDescription>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => approvePurchase(purchase.id)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                <XCircle className="mr-2 h-4 w-4" /> Cancelar
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Seguro que deseas cancelar?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cancelPurchase(purchase.id)} className="bg-destructive hover:bg-destructive/90">Sí, Cancelar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});