import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, PackageCheck, XCircle, Pencil } from "lucide-react";
import { ReceiveModal } from "./receive-modal";
import { PaymentModal } from "./payment-modal";
import type { PurchaseItem, PurchaseStatus, Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";
import { Link } from "@inertiajs/react";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { ReturnModal } from "./ReturnModal";

interface Props {

    permissions: { [key: string]: boolean };
    actions: { [key: string]: () => void };
    pendingItemsList: any[];

    balanceTotal: number;

    canUpdate: boolean;
    purchase: Purchase;
}

export function PurchaseItemsTable({ permissions, actions, pendingItemsList, balanceTotal, canUpdate, purchase }: Props) {
    const { items, status, id: purchaseId } = purchase;
    const canReturnItems = ['partially_received', 'received'].includes(status);
    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Detalle de Ítems ({items.length})</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    {permissions.canBeApproved && <Button onClick={actions.approve} className="gap-2"><CheckCircle className="h-4 w-4" /> Aprobar Compra</Button>}
                    {permissions.canReceiveItems && <ReceiveModal purchaseId={purchaseId} items={pendingItemsList} />}
                    {permissions.canMakePayment && <PaymentModal purchaseId={purchaseId} maxAmount={toNum(balanceTotal)} />}
                    {status === 'draft' && canUpdate && (
                        <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href={PurchaseController.edit.url({ purchase: purchaseId })}>
                                <Pencil className="h-4 w-4" />
                                Editar
                            </Link>
                        </Button>
                    )}
                    {canReturnItems && <ReturnModal purchase={purchase} />}
                    {permissions.canBeCancelled && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" className="gap-2"><XCircle className="h-4 w-4" /> Cancelar Compra</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogDescription>Esta acción no se puede deshacer y cancelará la orden de compra.</AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Volver</AlertDialogCancel>
                                    <AlertDialogAction onClick={actions.cancel} className="bg-destructive hover:bg-destructive/90">Sí, Cancelar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[250px]">Producto</TableHead>
                            <TableHead className="text-right">Ordenado</TableHead>
                            <TableHead className="text-right">Recibido</TableHead>
                            <TableHead className="text-right font-bold">Pendiente</TableHead>
                            <TableHead className="text-right">Costo</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map(item => {
                            const pending = toNum(item.qty_ordered) - toNum(item.qty_received);
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product_variant.product.name}</div>
                                        <div className="text-xs text-muted-foreground">SKU: {item.product_variant.sku}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{toNum(item.qty_ordered)}</TableCell>
                                    <TableCell className="text-right">{toNum(item.qty_received)}</TableCell>
                                    <TableCell className={`text-right font-bold ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>{pending}</TableCell>
                                    <TableCell className="text-right">{money(toNum(item.unit_cost))}</TableCell>
                                    <TableCell className="text-right font-semibold">{money(toNum(item.line_total))}</TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Esta compra no tiene ítems.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}