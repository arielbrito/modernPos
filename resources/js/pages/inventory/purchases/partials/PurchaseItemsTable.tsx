import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Pencil, XCircle } from "lucide-react";
import { Link } from "@inertiajs/react";

import type { Purchase } from "@/types";
import { money, toNum } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { ReceiveModal } from "./receive-modal";
import { PaymentModal } from "./payment-modal";
import { ReturnModal } from "./ReturnModal";

/* ---------------------------------- Props --------------------------------- */

interface Props {
    purchase: Purchase;

    permissions: { [key: string]: boolean };
    actions: { [key: string]: () => void };
    pendingItemsList: Array<{ id: number; name: string; pending: number }>;

    balanceTotal: number;

    canUpdate: boolean;
}

/* -------------------------- Mobile Item “Card” ----------------------------- */

function MobileItemCard({
    name,
    sku,
    ordered,
    received,
    unitCost,
    lineTotal,
}: {
    name: string;
    sku: string;
    ordered: number;
    received: number;
    unitCost: number;
    lineTotal: number;
}) {
    const pending = Math.max(0, ordered - received);
    const pendingTone = pending > 0 ? "text-orange-600" : "text-green-600";

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
                <div>
                    <div className="font-medium leading-tight">{name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {sku}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                        <div className="text-muted-foreground">Ordenado</div>
                        <div className="font-medium">{ordered.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">Recibido</div>
                        <div className="font-medium">{received.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">Pendiente</div>
                        <div className={`font-semibold ${pendingTone}`}>{pending.toLocaleString()}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground">Costo Unit.</div>
                        <div className="font-medium">{money(unitCost)}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                    <div className="text-sm text-muted-foreground">Total línea</div>
                    <div className="font-semibold">{money(lineTotal)}</div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ----------------------------- Main Component ------------------------------ */

export function PurchaseItemsTable({
    purchase,
    permissions,
    actions,
    pendingItemsList,
    balanceTotal,
    canUpdate,
}: Props) {
    const { items, status, id: purchaseId } = purchase;
    const canReturnItems = ["partially_received", "received"].includes(status);

    return (
        <Card>
            <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Detalle de Ítems ({items.length})</CardTitle>

                    {/* Evitamos duplicar acciones: ocultas en móvil (usas bottom bar) y en md+ (usas top bar). 
             Si las quieres visibles aquí, quita las clases `hidden` */}
                    <div className="hidden">
                        {/* placeholder para evitar saltos si decides mostrarlas luego */}
                    </div>

                    <div className="hidden">
                        {/* idem */}
                    </div>
                </div>

                {/* Si quieres tener un set mínimo de acciones embebido aquí, 
            descomenta y ajusta la visibilidad:
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {permissions.canBeApproved && (
            <Button onClick={actions.approve} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Aprobar Compra
            </Button>
          )}
          {permissions.canReceiveItems && (
            <ReceiveModal purchaseId={purchaseId} items={pendingItemsList} />
          )}
          {permissions.canMakePayment && (
            <PaymentModal purchaseId={purchaseId} maxAmount={toNum(balanceTotal)} />
          )}
          {status === "draft" && canUpdate && (
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
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" /> Cancelar Compra
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer y cancelará la orden de compra.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction onClick={actions.cancel} className="bg-destructive hover:bg-destructive/90">
                    Sí, Cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        */}
            </CardHeader>

            <CardContent className="overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[260px]">Producto</TableHead>
                                <TableHead className="text-right">Ordenado</TableHead>
                                <TableHead className="text-right">Recibido</TableHead>
                                <TableHead className="text-right font-bold">Pendiente</TableHead>
                                <TableHead className="text-right">Costo</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((item) => {
                                    const ordered = toNum(item.qty_ordered);
                                    const received = toNum(item.qty_received);
                                    const pending = Math.max(0, ordered - received);

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.product_variant.product.name}</div>
                                                <div className="text-xs text-muted-foreground">SKU: {item.product_variant.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{ordered.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{received.toLocaleString()}</TableCell>
                                            <TableCell className={`text-right font-semibold ${pending > 0 ? "text-orange-600" : "text-green-600"}`}>
                                                {pending.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">{money(toNum(item.unit_cost))}</TableCell>
                                            <TableCell className="text-right font-semibold">{money(toNum(item.line_total))}</TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Esta compra no tiene ítems.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile stacked cards */}
                <div className="md:hidden space-y-3">
                    {items.length > 0 ? (
                        items.map((item) => (
                            <MobileItemCard
                                key={item.id}
                                name={item.product_variant.product.name}
                                sku={item.product_variant.sku}
                                ordered={toNum(item.qty_ordered)}
                                received={toNum(item.qty_received)}
                                unitCost={toNum(item.unit_cost)}
                                lineTotal={toNum(item.line_total)}
                            />
                        ))
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                Esta compra no tiene ítems.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
