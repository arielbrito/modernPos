// resources/js/pages/inventory/adjustments/show.tsx
import * as React from "react";
import { Head, Link } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    ArrowLeft,
    Printer,
    Package,
    Calendar,
    User,
    Store,
    FileText,
    FileDown,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { BreadcrumbItem, InventoryAdjustment } from "@/types";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";
import { fmtDate } from "@/utils/date";
import { toNum, type NumberLike } from "@/utils/inventory";

/** Props tipadas */
interface Props {
    adjustment: InventoryAdjustment & {
        items: Array<{
            id: number | string;
            previous_quantity: NumberLike;
            new_quantity: NumberLike;
            cost?: NumberLike;
            variant: { sku: string; product: { name: string } };
        }>;
    };
}

/** helpers localStorage */
const LS_KEYS = {
    paper: "ia.print.paper",
    copy: "ia.print.copy",
} as const;

function safeGetLS(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
function safeSetLS(key: string, val: string) {
    try {
        localStorage.setItem(key, val);
    } catch { }
}

/** Fábrica de URLs de impresión/descarga con parámetros soportados por el backend */
function buildPrintUrl(
    base: string,
    {
        paper,
        copy,
        download
    }: { paper: "letter" | "a4"; copy: boolean; download?: boolean }
) {
    const url = new URL(base, window.location.origin);
    url.searchParams.set("paper", paper);
    if (copy) url.searchParams.set("copy", "1");
    if (download) url.searchParams.set("download", "1");
    return url.toString();
}

const InfoRow = ({
    icon,
    label,
    children
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) => (
    <div>
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            {icon}
            {label}
        </div>
        <div className="mt-1 text-base">{children}</div>
    </div>
);

export default function ShowInventoryAdjustment({ adjustment }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Ajustes", href: InventoryAdjustmentController.index.url() },
        { title: adjustment.code, href: "#" }
    ];

    // Controles de impresión con preferencias recordadas
    const [paper, setPaper] = React.useState<"letter" | "a4">("letter");
    const [isCopy, setIsCopy] = React.useState<boolean>(false);

    // cargar preferencias al montar
    React.useEffect(() => {
        const p = safeGetLS(LS_KEYS.paper) as "letter" | "a4" | null;
        const c = safeGetLS(LS_KEYS.copy);
        if (p === "letter" || p === "a4") setPaper(p);
        if (c === "1") setIsCopy(true);
    }, []);

    // guardar cuando cambien
    React.useEffect(() => {
        safeSetLS(LS_KEYS.paper, paper);
    }, [paper]);
    React.useEffect(() => {
        safeSetLS(LS_KEYS.copy, isCopy ? "1" : "0");
    }, [isCopy]);

    // URL base generada por tu action helper
    const basePrint = InventoryAdjustmentController.print.url({
        adjustment: Number(adjustment.id)
    });

    const printUrl = React.useMemo(
        () => buildPrintUrl(basePrint, { paper, copy: isCopy }),
        [basePrint, paper, isCopy]
    );
    const downloadUrl = React.useMemo(
        () => buildPrintUrl(basePrint, { paper, copy: isCopy, download: true }),
        [basePrint, paper, isCopy]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ajuste ${adjustment.code}`} />
            <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
                {/* Header acciones */}
                <div className="flex items-center justify-between">
                    <Link
                        href={InventoryAdjustmentController.index.url()}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>

                    <div className="flex items-center gap-2">
                        {/* Botones rápidos (respetan preferencias guardadas) */}
                        <Button asChild variant="outline" className="gap-2">
                            <a href={printUrl} target="_blank" rel="noopener noreferrer" title="Imprimir / Vista previa">
                                <Printer className="h-4 w-4" />
                                Imprimir
                            </a>
                        </Button>
                        <Button asChild variant="secondary" className="gap-2">
                            <a href={downloadUrl} title="Descargar PDF">
                                <FileDown className="h-4 w-4" />
                                Descargar
                            </a>
                        </Button>

                        {/* Menú de configuración de PDF */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" className="gap-2">
                                    <MoreVertical className="h-4 w-4" />
                                    PDF / Opciones
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Opciones
                                </DropdownMenuLabel>

                                <div className="px-2 py-1.5">
                                    <div className="text-xs mb-1 text-muted-foreground">Tamaño de papel</div>
                                    <Select
                                        value={paper}
                                        onValueChange={(v) =>
                                            setPaper((v as "letter" | "a4") ?? "letter")
                                        }
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Tamaño" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="letter">Letter (8.5×11")</SelectItem>
                                            <SelectItem value="a4">A4 (210×297mm)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="px-2 py-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">Marcar como copia</div>
                                        <Switch checked={isCopy} onCheckedChange={setIsCopy} />
                                    </div>
                                </div>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <a href={printUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                                        <Printer className="h-4 w-4" />
                                        Imprimir / Vista previa
                                    </a>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <a href={downloadUrl} className="gap-2">
                                        <FileDown className="h-4 w-4" />
                                        Descargar PDF
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Cabecera del ajuste */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Package className="h-6 w-6" />
                            Detalle del Ajuste: {adjustment.code}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoRow icon={<Calendar />} label="Fecha">
                            {fmtDate(adjustment.adjustment_date)}
                        </InfoRow>
                        <InfoRow icon={<FileText />} label="Motivo">
                            {adjustment.reason}
                        </InfoRow>
                        <InfoRow icon={<Store />} label="Tienda">
                            {adjustment.store.name}
                        </InfoRow>
                        <InfoRow icon={<User />} label="Usuario">
                            {adjustment.user?.name || "N/A"}
                        </InfoRow>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos Ajustados ({adjustment.items.length})</CardTitle>
                    </CardHeader>
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
                                {adjustment.items.map((item: any) => {
                                    const change =
                                        toNum(item.new_quantity) - toNum(item.previous_quantity);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.variant.product.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {item.variant.sku}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {toNum(item.previous_quantity)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {toNum(item.new_quantity)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-mono font-bold ${change > 0 ? "text-green-600" : "text-red-600"
                                                    }`}
                                            >
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
