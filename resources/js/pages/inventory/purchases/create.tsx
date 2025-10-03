// resources/js/pages/inventory/purchases/create.tsx
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, useForm } from "@inertiajs/react";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PackagePlus, Plus, ScanLine, ClipboardPaste, Save, Delete, DollarSign, Sparkles } from "lucide-react";

// Utils / Types
import type { BreadcrumbItem, Supplier } from "@/types";
import { AsyncSmartCombobox, type ItemOption } from "./partials/AsyncSmartCombobox";
import { SmartCombobox } from "./partials/smart-combobox";
import { money, purchaseTotals, toNum } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// ---- Tipos locales simplificados ----
interface PurchaseItemData {
    id?: string; // key React
    product_variant_id: number | null;
    product_label?: string;
    qty_ordered: number | string;
    unit_cost: number | string;
    discount_pct: number | string;
    tax_pct: number | string;
}

interface FormData {
    supplier_id: number | null;
    invoice_number: string;
    invoice_date: string;
    currency: string;
    exchange_rate: number | string;
    freight: number | string;
    other_costs: number | string;
    notes: string;
    items: PurchaseItemData[];
}

interface Props {
    suppliers: Supplier[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: PurchaseController.index.url() },
    { title: "Nueva", href: PurchaseController.create.url() },
];

function createEmptyItem(): PurchaseItemData {
    return {
        id: crypto.randomUUID(),
        product_variant_id: null,
        qty_ordered: 1,
        unit_cost: 0,
        discount_pct: 0,
        tax_pct: 0,
    };
}

export default function CreatePurchase({ suppliers }: Props) {
    const form = useForm<FormData>({
        supplier_id: null,
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        currency: "DOP",
        exchange_rate: 1,
        freight: 0,
        other_costs: 0,
        notes: "",
        items: [createEmptyItem()],
    });

    // --- Opciones proveedores
    const supplierOpts: ItemOption[] = React.useMemo(
        () => suppliers.map((s) => ({ value: s.id, label: s.name })),
        [suppliers]
    );

    // --- Totales
    const totals = React.useMemo(
        () => purchaseTotals(form.data.items, form.data.freight, form.data.other_costs),
        [form.data.items, form.data.freight, form.data.other_costs]
    );

    // --- Helpers de items
    const handleItemUpdate = (idx: number, patch: Partial<PurchaseItemData>) => {
        const newItems = form.data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        form.setData("items", newItems);
    };

    const handleProductChange = (idx: number, opt: ItemOption | null) => {
        if (!opt) {
            handleItemUpdate(idx, { product_variant_id: null, product_label: "", unit_cost: 0 });
            return;
        }
        handleItemUpdate(idx, {
            product_variant_id: Number(opt.value),
            product_label: opt.label,
            unit_cost: toNum(opt.cost_price) || 0,
        });
    };

    const addItem = () => {
        form.setData("items", [...form.data.items, createEmptyItem()]);
    };

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) {
            toast.error("Debe mantener al menos una línea de producto");
            return;
        }
        form.setData("items", form.data.items.filter((_, i) => i !== idx));
    };

    // --- Barra rápida de captura (para power users)
    const [quickSel, setQuickSel] = React.useState<ItemOption | null>(null);
    const quickQtyRef = React.useRef<HTMLInputElement | null>(null);
    const [quickQty, setQuickQty] = React.useState<string>("1");
    const [quickCost, setQuickCost] = React.useState<string>("");

    const addQuickLine = () => {
        if (!quickSel) {
            toast.error("Selecciona un producto");
            return;
        }
        const qty = Math.max(0.01, toNum(quickQty));
        const cost = quickCost !== "" ? toNum(quickCost) : toNum(quickSel.cost_price);
        const newLine: PurchaseItemData = {
            id: crypto.randomUUID(),
            product_variant_id: Number(quickSel.value),
            product_label: quickSel.label,
            qty_ordered: qty,
            unit_cost: cost,
            discount_pct: 0,
            tax_pct: 0,
        };
        form.setData("items", [newLine, ...form.data.items]);
        // limpiar barra rápida
        setQuickSel(null);
        setQuickQty("1");
        setQuickCost("");
        // focus qty para velocidad
        setTimeout(() => quickQtyRef.current?.focus(), 0);
    };

    const onQuickKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addQuickLine();
        }
    };

    // --- Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validItems = form.data.items.filter(
            (it) => it.product_variant_id && toNum(it.qty_ordered) > 0
        );

        if (validItems.length === 0) {
            toast.error("Debes agregar al menos un producto con una cantidad válida.");
            return;
        }

        const payload = {
            ...form.data,
            items: validItems.map(({ id, product_label, ...rest }) => rest),
        };

        form.transform(() => payload);
        form.post(PurchaseController.store.url(), {
            onSuccess: () => toast.success("Compra creada exitosamente"),
            onError: (errs) => {
                console.error("Errores:", errs);
                toast.error("Hay errores en el formulario. Revísalos.");
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Compra" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">

                {/* Banda superior con acciones */}
                <div className="pos-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <PackagePlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Nueva Compra</h1>
                            <p className="text-sm text-muted-foreground">Captura ágil, totales claros y validación inline.</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="button" variant="outline" className="pos-hover gap-2">
                            <ScanLine className="h-4 w-4" />
                            Escanear
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="pos-hover gap-2"
                            onClick={() => {
                                navigator.clipboard.readText().then((txt) => {
                                    // formato rápido: sku\tqty\tcost por línea
                                    const rows = txt
                                        .split("\n")
                                        .map((l) => l.trim())
                                        .filter(Boolean);
                                    if (rows.length === 0) return;
                                    toast.success(`Pegadas ${rows.length} línea(s). Ajusta antes de guardar.`);
                                });
                            }}
                        >
                            <ClipboardPaste className="h-4 w-4" />
                            Pegar líneas
                        </Button>
                        <Button
                            type="submit"
                            form="purchase-form"
                            disabled={form.processing}
                            className="pos-button-primary gap-2 min-w-[140px]"
                        >
                            <Save className="h-4 w-4" />
                            {form.processing ? "Guardando..." : "Guardar borrador"}
                        </Button>
                    </div>
                </div>

                <form id="purchase-form" onSubmit={handleSubmit} className="grid gap-6">

                    {/* Info proveedor / cabecera */}
                    <Card className="pos-card">
                        <CardHeader>
                            <CardTitle>Información del Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="md:col-span-2">
                                <Label>Proveedor <span className="text-destructive">*</span></Label>
                                <SmartCombobox
                                    items={supplierOpts}
                                    value={form.data.supplier_id}
                                    onChange={(v) => form.setData("supplier_id", v as number | null)}
                                    placeholder="Selecciona un proveedor…"
                                    className="pos-input"
                                />
                                {form.errors.supplier_id && (
                                    <p className="text-xs text-destructive mt-1">{form.errors.supplier_id}</p>
                                )}
                            </div>
                            <div>
                                <Label>No. Factura <span className="text-destructive">*</span></Label>
                                <Input
                                    value={form.data.invoice_number}
                                    onChange={(e) => form.setData("invoice_number", e.target.value)}
                                    placeholder="FAC-0001"
                                    className="pos-input"
                                />
                                {form.errors.invoice_number && (
                                    <p className="text-xs text-destructive mt-1">{form.errors.invoice_number}</p>
                                )}
                            </div>
                            <div>
                                <Label>Fecha Factura</Label>
                                <Input
                                    type="date"
                                    value={form.data.invoice_date}
                                    onChange={(e) => form.setData("invoice_date", e.target.value)}
                                    className="pos-input"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Barra rápida de captura */}
                    <Card className="pos-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" /> Captura Rápida
                            </CardTitle>
                        </CardHeader>
                        <CardContent onKeyDown={onQuickKeyDown}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-7">
                                    <AsyncSmartCombobox
                                        searchUrl={PurchaseController.searchProducts.url()}
                                        value={quickSel}
                                        onChange={(opt) => {
                                            setQuickSel(opt);
                                            if (opt?.cost_price) setQuickCost(String(opt.cost_price));
                                        }}
                                        placeholder="Buscar por SKU o nombre…"
                                        className="pos-input"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="sr-only">Cantidad</Label>
                                    <Input
                                        ref={quickQtyRef}
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={quickQty}
                                        onChange={(e) => setQuickQty(e.target.value)}
                                        placeholder="Cant."
                                        className="pos-input text-right"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="sr-only">Costo</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={quickCost}
                                        onChange={(e) => setQuickCost(e.target.value)}
                                        placeholder="Costo"
                                        className="pos-input text-right"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <Button type="button" onClick={addQuickLine} className="w-full pos-button-primary gap-2">
                                        <Plus className="h-4 w-4" /> Agregar
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Tip: presiona <kbd className="px-1 rounded bg-muted">Enter</kbd> para agregar.</p>
                        </CardContent>
                    </Card>

                    {/* Detalle de productos */}
                    <Card className="pos-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Detalle de Productos</CardTitle>
                            <Button type="button" onClick={addItem} size="sm" variant="outline" className="gap-2 pos-hover">
                                <Plus className="h-4 w-4" />
                                Agregar línea
                            </Button>
                        </CardHeader>

                        <CardContent className="overflow-x-auto scrollbar-stoneretail rounded-lg border">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead className="min-w-[320px]">Producto</TableHead>
                                        <TableHead className="w-[110px] text-right">Cantidad</TableHead>
                                        <TableHead className="w-[140px] text-right">Costo Unit.</TableHead>
                                        <TableHead className="w-[120px] text-right">Desc. %</TableHead>
                                        <TableHead className="w-[120px] text-right">Imp. %</TableHead>
                                        <TableHead className="w-[140px] text-right">Total Línea</TableHead>
                                        <TableHead className="w-[60px]">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {form.data.items.map((item, idx) => (
                                        <TableRow key={item.id || idx} className="hover:pos-hover">
                                            <TableCell>
                                                <AsyncSmartCombobox
                                                    searchUrl={PurchaseController.searchProducts.url()}
                                                    value={
                                                        item.product_variant_id
                                                            ? { value: item.product_variant_id, label: item.product_label ?? "" }
                                                            : null
                                                    }
                                                    onChange={(opt) => handleProductChange(idx, opt)}
                                                    placeholder="Buscar por SKU o nombre…"
                                                    className="pos-input"
                                                />
                                                {form.errors[`items.${idx}.product_variant_id`] && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        {form.errors[`items.${idx}.product_variant_id`]}
                                                    </p>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className="pos-input text-right"
                                                    value={String(item.qty_ordered)}
                                                    onChange={(e) => handleItemUpdate(idx, { qty_ordered: toNum(e.target.value) })}
                                                    placeholder="1"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="pos-input text-right"
                                                    value={String(item.unit_cost)}
                                                    onChange={(e) => handleItemUpdate(idx, { unit_cost: toNum(e.target.value) })}
                                                    placeholder="0.00"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="pos-input text-right"
                                                    value={String(item.discount_pct)}
                                                    onChange={(e) => handleItemUpdate(idx, { discount_pct: toNum(e.target.value) })}
                                                    placeholder="0"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="pos-input text-right"
                                                    value={String(item.tax_pct)}
                                                    onChange={(e) => handleItemUpdate(idx, { tax_pct: toNum(e.target.value) })}
                                                    placeholder="0"
                                                />
                                            </TableCell>

                                            <TableCell className="text-right font-medium">
                                                {money(totals.calculatedItems[idx]?.line_total || 0)}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(idx)}
                                                    disabled={form.data.items.length <= 1}
                                                    className="text-destructive hover:text-destructive"
                                                    title="Eliminar línea"
                                                >
                                                    <Delete className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Notas + Totales */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="pos-card md:col-span-2">
                            <CardHeader>
                                <CardTitle>Notas y Observaciones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    rows={5}
                                    value={form.data.notes}
                                    onChange={(e) => form.setData("notes", e.target.value)}
                                    placeholder="Observaciones adicionales sobre la compra…"
                                    className="resize-none pos-input"
                                />
                            </CardContent>
                        </Card>

                        <Card className="pos-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    Resumen de Totales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <Row label="Subtotal" value={totals.subtotal} />
                                    <Row label="Descuentos" value={totals.discount_total} prefix="-" className="text-emerald-700" />
                                    <Row label="Impuestos" value={totals.tax_total} />

                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="freight" className="text-sm">Flete</Label>
                                        <Input
                                            id="freight"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-8 w-28 text-right pos-input"
                                            value={form.data.freight}
                                            onChange={(e) => form.setData("freight", toNum(e.target.value))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="other_costs" className="text-sm">Otros costos</Label>
                                        <Input
                                            id="other_costs"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-8 w-28 text-right pos-input"
                                            value={form.data.other_costs}
                                            onChange={(e) => form.setData("other_costs", toNum(e.target.value))}
                                        />
                                    </div>

                                    <Separator className="my-3" />
                                    <div className="flex justify-between font-bold text-lg text-primary">
                                        <span>TOTAL</span>
                                        <span>{money(totals.grand_total)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

// Fila compacta del resumen
function Row({
    label,
    value,
    className,
    prefix,
}: {
    label: string;
    value: number;
    className?: string;
    prefix?: string;
}) {
    return (
        <div className={`flex justify-between ${className ?? ""}`}>
            <span>{label}</span>
            <span className="font-medium">{prefix ? `${prefix} ` : ""}{money(value)}</span>
        </div>
    );
}
