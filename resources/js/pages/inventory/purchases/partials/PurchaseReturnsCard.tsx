import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Undo2 } from "lucide-react";
import type { PurchaseReturn } from "@/types";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";

interface Props {
    returns: PurchaseReturn[];
}

export function PurchaseReturnsCard({ returns }: Props) {
    if (returns.length === 0) {
        return null; // No mostramos nada si no hay devoluciones
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Undo2 className="h-5 w-5 text-primary" />
                    Historial de Devoluciones ({returns.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returns.map(ret => (
                            <TableRow key={ret.id}>
                                <TableCell>{fmtDate(ret.return_date)}</TableCell>
                                <TableCell className="font-mono">{ret.code}</TableCell>
                                <TableCell>{ret.user?.name || 'N/A'}</TableCell>
                                <TableCell className="text-right font-medium">{money(ret.total_value)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}