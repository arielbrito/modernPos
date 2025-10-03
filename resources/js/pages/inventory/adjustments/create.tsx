import * as React from "react";
import { Head, useForm } from "@inertiajs/react";

// LAYOUT & UI
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { AsyncSmartCombobox, type ItemOption } from "@/pages/inventory/purchases/partials/AsyncSmartCombobox";

// TYPES & ACTIONS
import type { BreadcrumbItem } from "@/types";
import { toNum } from "@/utils/inventory";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";
import ProductController from "@/actions/App/Http/Controllers/Inventory/ProductController";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdjustmentItemData {
    id: string;
    product_variant_id: number | null;
    product_label: string;
    sku: string;
    previous_quantity: number;
    new_quantity: number | string;
}

interface FormData {
    reason: string;
    adjustment_date: string; // yyyy-mm-dd
    notes: string;
    items: AdjustmentItemData[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Ajustes de Inventario", href: InventoryAdjustmentController.index.url() },
    { title: "Nuevo", href: InventoryAdjustmentController.create.url() },
];

function safeUUID() {
    try {
        return crypto.randomUUID();
    } catch {
        return Math.random().toString(36).slice(2);
    }
}

function createEmptyItem(): AdjustmentItemData {
    return {
        id: safeUUID(),
        product_variant_id: null,
        product_label: "",
        sku: "",
        previous_quantity: 0,
        new_quantity: "",
    };
}

export default function CreateInventoryAdjustment() {
    const form = useForm<FormData>({
        reason: "",
        adjustment_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [createEmptyItem()],
    });

    const addItem = () => form.setData("items", [...form.data.items, createEmptyItem()]);

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) {
            toast.error("Debe mantener al menos una línea de producto.");
            return;
        }
        form.setData(
            "items",
            form.data.items.filter((_, i) => i !== idx),
        );
    };

    const handleItemUpdate = (idx: number, patch: Partial<AdjustmentItemData>) => {
        form.setData(
            "items",
            form.data.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
        );
    };

    const handleProductChange = (idx: number, selectedOption: ItemOption | null) => {
        if (!selectedOption) {
            handleItemUpdate(idx, {
                product_variant_id: null,
                product_label: "",
                sku: "",
                previous_quantity: 0,
                new_quantity: "",
            });
            return;
        }

        const stockQty = toNum((selectedOption as any).stock_quantity ?? 0);

        handleItemUpdate(idx, {
            product_variant_id: selectedOption.value as number,
            product_label: selectedOption.label,
            sku: (selectedOption as any).sku || "",
            previous_quantity: stockQty,
            new_quantity: stockQty,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validItems = form.data.items.filter(
            (item) => !!item.product_variant_id && item.new_quantity !== "",
        );

        if (validItems.length === 0) {
            toast.error("Debe agregar al menos un producto con una cantidad final válida.");
            return;
        }

        const payload: FormData = { ...form.data, items: validItems };

        form.transform(() => payload);
        form.post(InventoryAdjustmentController.store.url(), {
            onSuccess: () => {
                toast.success("Ajuste de inventario guardado exitosamente.");
            },
            onError: (errs) => {
                const flat =
                    typeof errs === "object"
                        ? Object.values(errs)
                            .flat()
                            .map((x) => (Array.isArray(x) ? x.join(" ") : x))
                            .join(" ")
                        : "Revise los campos.";
                toast.error("Hubo un error al guardar el ajuste.", { description: flat });
            },
            preserveScroll: true,
        });
    };

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
                const formEl = document.getElementById("inv-adj-form") as HTMLFormElement | null;
                if (formEl) formEl.requestSubmit();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const canSubmit =
        !form.processing &&
        form.data.reason.trim().length > 0 &&
        form.data.adjustment_date &&
        form.data.items.some((it) => it.product_variant_id && it.new_quantity !== "");

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Ajuste de Inventario" />
            <div className="mx-auto max-w-4xl p-4 md:p-6">
                <form id="inv-adj-form" onSubmit={handleSubmit} className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PackagePlus className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold">Nuevo Ajuste de Inventario</h1>
                        </div>
                        <Button type="submit" disabled={!canSubmit}>
                            {form.processing ? "Guardando..." : "Guardar Ajuste"}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Ajuste</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="adjustment_date">
                                    Fecha del Ajuste <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="adjustment_date"
                                    type="date"
                                    value={form.data.adjustment_date}
                                    onChange={(e) => form.setData("adjustment_date", e.target.value)}
                                />
                                {form.errors.adjustment_date && (
                                    <p className="text-sm text-red-600 mt-1">{form.errors.adjustment_date}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="reason">
                                    Motivo <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="reason"
                                    value={form.data.reason}
                                    onChange={(e) => form.setData("reason", e.target.value)}
                                    placeholder="Ej: Conteo físico mensual / Mermas / Saneamiento"
                                />
                                {form.errors.reason && <p className="text-sm text-red-600 mt-1">{form.errors.reason}</p>}
                            </div>

                            <div className="md:col-span-3">
                                <Label htmlFor="notes">Notas Adicionales</Label>
                                <Textarea
                                    id="notes"
                                    value={form.data.notes}
                                    onChange={(e) => form.setData("notes", e.target.value)}
                                    placeholder="Observaciones del ajuste…"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Productos a Ajustar</CardTitle>
                            <Button type="button" onClick={addItem} size="sm" variant="outline" className="gap-2" aria-label="Agregar producto">
                                <Plus className="h-4 w-4" /> Agregar Producto
                            </Button>
                        </CardHeader>

                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Producto</TableHead>
                                            <TableHead className="text-right">Stock Actual</TableHead>
                                            <TableHead className="text-right">Stock Físico (Contado)</TableHead>
                                            <TableHead className="text-right font-bold">Ajuste</TableHead>
                                            <TableHead>Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {form.data.items.map((item, idx) => {
                                            const prev = toNum(item.previous_quantity);
                                            const next = toNum(item.new_quantity);
                                            const delta = next - prev;

                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <AsyncSmartCombobox
                                                            searchUrl={ProductController.search.url()}
                                                            value={
                                                                item.product_variant_id
                                                                    ? { value: item.product_variant_id, label: item.product_label, sku: item.sku }
                                                                    : null
                                                            }
                                                            onChange={(option) => handleProductChange(idx, option)}
                                                            placeholder="Buscar por SKU o nombre…"
                                                        />
                                                        {form.errors[`items.${idx}.product_variant_id` as keyof typeof form.errors] && (
                                                            <p className="text-sm text-red-600 mt-1">
                                                                {String(form.errors[`items.${idx}.product_variant_id` as keyof typeof form.errors])}
                                                            </p>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right tabular-nums">
                                                        {prev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            inputMode="decimal"
                                                            value={String(item.new_quantity)}
                                                            onFocus={(e) => e.currentTarget.select()}
                                                            onChange={(e) => handleItemUpdate(idx, { new_quantity: e.target.value })}
                                                            className="text-right"
                                                            aria-label={`Nuevo stock fila ${idx + 1}`}
                                                        />
                                                        {form.errors[`items.${idx}.new_quantity` as keyof typeof form.errors] && (
                                                            <p className="text-sm text-red-600 mt-1">
                                                                {String(form.errors[`items.${idx}.new_quantity` as keyof typeof form.errors])}
                                                            </p>
                                                        )}
                                                    </TableCell>

                                                    <TableCell
                                                        className={`text-right font-bold tabular-nums ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : ""
                                                            }`}
                                                    >
                                                        {delta === 0
                                                            ? "—"
                                                            : `${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            })}`}
                                                    </TableCell>

                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className={form.data.items.length <= 1 ? "inline-flex" : ""}>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => removeItem(idx)}
                                                                            disabled={form.data.items.length <= 1}
                                                                            className="text-destructive hover:text-destructive"
                                                                            aria-label={`Eliminar fila ${idx + 1}`}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </span>
                                                                </TooltipTrigger>
                                                                {form.data.items.length <= 1 && (
                                                                    <TooltipContent>Agrega otra línea antes de eliminar esta</TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
