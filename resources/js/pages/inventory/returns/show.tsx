// resources/js/pages/inventory/returns/show.tsx
import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown, Package } from "lucide-react";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";
import { urlWith } from "@/lib/urlWith";

type Item = {
    id: number | string;
    quantity: number | string;
    unit_cost: number | string;
    line_total: number | string;
    variant: { sku: string; product: { name: string } };
};

interface Props {
    return: {
        id: number;
        code: string;
        status: string;
        total_value: number | string;
        return_date: string;
        store: { id: number; name: string };
        user?: { id: number; name: string } | null;
        purchase: { id: number; code: string };
        items: Item[];
    };
}

// ── helpers ────────────────────────────────────────────────────────────────────
type Paper = "letter" | "a4";
const LS_KEYS = { paper: "pr.print.paper", copy: "pr.print.copy" } as const;
const safeGet = (k: string) => {
    try {
        return localStorage.getItem(k);
    } catch {
        return null;
    }
};
const safeSet = (k: string, v: string) => {
    try {
        localStorage.setItem(k, v);
    } catch { }
};
const fmtMoney = (n: number | string) =>
    Number(n ?? 0).toLocaleString("es-DO", { style: "currency", currency: "DOP" });

// ── component ─────────────────────────────────────────────────────────────────
export default function Show({ return: r }: Props) {
    const [paper, setPaper] = React.useState<Paper>("letter");
    const [copy, setCopy] = React.useState(false);

    React.useEffect(() => {
        const p = safeGet(LS_KEYS.paper);
        if (p === "a4" || p === "letter") setPaper(p);
        const c = safeGet(LS_KEYS.copy) === "1";
        setCopy(c);
    }, []);
    React.useEffect(() => safeSet(LS_KEYS.paper, paper), [paper]);
    React.useEffect(() => safeSet(LS_KEYS.copy, copy ? "1" : "0"), [copy]);

    // ✅ Wayfinder: usar .url() para obtener el string
    const base = PurchaseReturnController.print.url({ return: r.id });
    const printUrl = urlWith(base, paper, copy, false);
    const downloadUrl = urlWith(base, paper, copy, true);

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Devoluciones", href: PurchaseReturnController.index.url() },
                { title: r.code, href: "#" },
            ]}
        >
            <Head title={`Devolución ${r.code}`} />

            <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
                {/* Header acciones */}
                <div className="flex items-center justify-between">
                    <Link
                        href={PurchaseReturnController.index.url()}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Link>

                    <div className="flex items-center gap-2">
                        <Select value={paper} onValueChange={(v) => setPaper(v as Paper)}>
                            <SelectTrigger className="h-9 w-[120px]">
                                <SelectValue placeholder="Tamaño" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="letter">Letter</SelectItem>
                                <SelectItem value="a4">A4</SelectItem>
                            </SelectContent>
                        </Select>


                        <label className="text-sm flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={copy}
                                onChange={(e) => setCopy(e.target.checked)}
                            />
                            Copia
                        </label>

                        <Button asChild variant="outline">
                            <a href={printUrl} target="_blank" rel="noopener noreferrer">
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir
                            </a>
                        </Button>

                        <Button asChild variant="secondary">
                            <a href={downloadUrl}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Descargar
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Encabezado */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Devolución {r.code}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-xs text-muted-foreground">Fecha</div>
                            <div>{new Date(r.return_date).toLocaleString("es-DO")}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Compra</div>
                            <div>{r.purchase.code}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Tienda</div>
                            <div>{r.store.name}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Usuario</div>
                            <div>{r.user?.name ?? "N/A"}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ítems ({r.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto (SKU)</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {r.items.map((it) => (
                                    <TableRow key={it.id}>
                                        <TableCell>
                                            <div className="font-medium">{it.variant.product.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {it.variant.sku}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(it.quantity).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {fmtMoney(Number(it.unit_cost))}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {fmtMoney(Number(it.line_total))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-semibold">
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {fmtMoney(Number(r.total_value))}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
