import * as React from "react";
import { Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, CheckCircle, XCircle, MoreVertical, Loader2 } from "lucide-react";
import type { Purchase } from "@/types";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchase: Purchase;
    actions: ReturnType<typeof usePurchaseActions>;
}

export const ActionMenu = React.memo(function ActionMenu({ purchase, actions }: Props) {
    const { approvePurchase, cancelPurchase, loadingStates } = actions;

    const isApproving = loadingStates.approving === purchase.id;
    const isCancelling = loadingStates.cancelling === purchase.id;
    const isBusy = isApproving || isCancelling;

    const canApprove = purchase.status === "draft";
    const canCancel = !["received", "partially_received", "cancelled"].includes(purchase.status);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Acciones de la compra"
                    disabled={isBusy}
                >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
                {/* Ver detalles */}
                <DropdownMenuItem asChild>
                    <Link href={PurchaseController.show.url({ purchase: purchase.id })}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                    </Link>
                </DropdownMenuItem>

                {/* Aprobar */}
                {canApprove && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                disabled={isApproving}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {isApproving ? "Aprobando..." : "Aprobar"}
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción marcará la compra como aprobada y ya no se podrá editar.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => approvePurchase(purchase.id)}
                                >
                                    Confirmar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {/* Cancelar */}
                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 focus:text-red-600"
                                disabled={isCancelling}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                {isCancelling ? "Cancelando..." : "Cancelar"}
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Cancelar compra?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => cancelPurchase(purchase.id)}
                                >
                                    Sí, cancelar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
