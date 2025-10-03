import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Undo2, Eye, Printer } from "lucide-react";
import type { PurchaseReturn } from "@/types";
import { money, toNum } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import { Link } from "@inertiajs/react";
import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";

// Pequeño badge para estado (si usas draft/completed/cancelled)
function ReturnStatusBadge({ status }: { status: PurchaseReturn["status"] }) {
    const map: Record<string, { text: string; className: string }> = {
        draft: { text: "Borrador", className: "bg-amber-100 text-amber-700" },
        completed: { text: "Completada", className: "bg-emerald-100 text-emerald-700" },
        cancelled: { text: "Cancelada", className: "bg-red-100 text-red-700" },
    };
    const cfg = map[status] ?? { text: status, className: "bg-muted text-foreground" };
    return (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.text}
        </span>
    );
}

interface Props {
    returns: PurchaseReturn[]; // asumes que cada item trae user?.name
}

export function PurchaseReturnsCard({ returns }: Props) {
    if (!returns || returns.length === 0) return null;

    const totalReturned = React.useMemo(
        () => returns.reduce((sum, r) => sum + toNum(r.total_value), 0),
        [returns]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Undo2 className="h-5 w-5 text-primary" />
                    Historial de Devoluciones ({returns.length})
                </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right w-[140px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returns.map((ret) => {
                            const printUrl = PurchaseReturnController.print
                                .url({ return: ret.id })
                                // si tienes parámetros de impresión (paper/copy) puedes agregarlos aquí
                                ;

                            return (
                                <TableRow key={ret.id}>
                                    <TableCell>{fmtDate(ret.return_date)}</TableCell>
                                    <TableCell className="font-mono">{ret.code}</TableCell>
                                    <TableCell><ReturnStatusBadge status={ret.status} /></TableCell>
                                    <TableCell>{ret.user?.name || "N/A"}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {money(ret.total_value)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={PurchaseReturnController.show.url({ return: ret.id })}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Link>
                                            </Button>
                                            <Button asChild size="sm" variant="secondary">
                                                <a href={printUrl} target="_blank" rel="noopener noreferrer">
                                                    <Printer className="h-4 w-4 mr-1" />
                                                    PDF
                                                </a>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-semibold">
                                Total devuelto
                            </TableCell>
                            <TableCell className="text-right font-bold">
                                {money(totalReturned)}
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
