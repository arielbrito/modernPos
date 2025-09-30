import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, Package, Calendar, User, Store, FileText } from "lucide-react";
import type { BreadcrumbItem, InventoryAdjustment } from "@/types";
import { fmtDate } from "@/utils/date";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";
import { NumberLike, toNum } from "@/utils/inventory";

interface Props {
    adjustment: InventoryAdjustment;
}

const InfoRow = ({ icon, label, children }: { icon: React.ReactNode, label: string, children: React.ReactNode }) => (
    <div>
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">{icon}{label}</div>
        <div className="mt-1 text-base">{children}</div>
    </div>
);

export default function ShowInventoryAdjustment({ adjustment }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Ajustes", href: InventoryAdjustmentController.index.url() },
        { title: adjustment.code, href: "#" },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ajuste ${adjustment.code}`} />
            <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={InventoryAdjustmentController.index.url()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>
                    <Button asChild>
                        <a href={InventoryAdjustmentController.print.url({ adjustment: adjustment.id })} target="_blank" rel="noopener noreferrer">
                            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
                        </a>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Package className="h-6 w-6" />
                            Detalle del Ajuste: {adjustment.code}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoRow icon={<Calendar />} label="Fecha">{fmtDate(adjustment.adjustment_date)}</InfoRow>
                        <InfoRow icon={<FileText />} label="Motivo">{adjustment.reason}</InfoRow>
                        <InfoRow icon={<Store />} label="Tienda">{adjustment.store.name}</InfoRow>
                        <InfoRow icon={<User />} label="Usuario">{adjustment.user?.name || 'N/A'}</InfoRow>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Productos Ajustados ({adjustment.items.length})</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto (SKU)</TableHead>
                                    <TableHead className="text-right">Stock Anterior</TableHead>
                                    <TableHead className="text-right">Stock Nuevo</TableHead>
                                    <TableHead className="text-right font-bold">Ajuste</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adjustment.items.map((item: { new_quantity: NumberLike; previous_quantity: NumberLike; id: React.Key | null | undefined; variant: { product: { name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }; sku: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }; }) => {
                                    const change = toNum(item.new_quantity) - toNum(item.previous_quantity);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.variant.product.name}</div>
                                                <div className="text-sm text-muted-foreground">{item.variant.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{toNum(item.previous_quantity)}</TableCell>
                                            <TableCell className="text-right font-mono">{toNum(item.new_quantity)}</TableCell>
                                            <TableCell className={`text-right font-mono font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {change > 0 ? `+${change}` : change}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}