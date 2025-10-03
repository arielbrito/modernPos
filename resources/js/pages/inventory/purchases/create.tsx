import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, useForm } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, DollarSign, PackagePlus, Sparkles, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import type { BreadcrumbItem, Supplier } from "@/types";
import { SmartCombobox, type ItemOption as SimpleItemOption } from "./partials/smart-combobox";
import { AsyncSmartCombobox, type ItemOption } from "./partials/AsyncSmartCombobox";
import { money, purchaseTotals, toNum } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

type NumberLike = number | string | undefined | null;

interface PurchaseItemData {
    id?: string;
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

/** Helpers */
const clamp = (n: NumberLike, min = 0, max = Infinity) => {
    const v = toNum(n);
    return Math.min(Math.max(v, min), max);
};
const NUM_INPUT_CLS = "h-8 w-24 md:w-28 text-right tabular-nums";

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

    // ---- Combos proveedores
    const supplierOpts: SimpleItemOption[] = React.useMemo(
        () => suppliers.map((s) => ({ value: s.id, label: s.name })),
        [suppliers]
    );

    // ---- Totales
    const totals = React.useMemo(
        () => purchaseTotals(form.data.items, form.data.freight, form.data.other_costs),
        [form.data.items, form.data.freight, form.data.other_costs]
    );

    // ---- Mutadores de items en tabla
    const handleItemUpdate = (idx: number, patch: Partial<PurchaseItemData>) => {
        form.setData(
            "items",
            form.data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
        );
    };
    const handleProductChange = (idx: number, selected: ItemOption | null) => {
        if (!selected) {
            handleItemUpdate(idx, { product_variant_id: null, unit_cost: 0, product_label: "" });
            return;
        }
        handleItemUpdate(idx, {
            product_variant_id: Number(selected.value),
            product_label: selected.label,
            unit_cost: toNum(selected.cost_price) || 0,
        });
    };
    const addItem = () => form.setData("items", [...form.data.items, createEmptyItem()]);
    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) {
            toast.error("Debe mantener al menos una línea de producto");
            return;
        }
        form.setData("items", form.data.items.filter((_, i) => i !== idx));
    };

    // ---- Barra Rápida (UX)
    const [quickSelected, setQuickSelected] = React.useState<ItemOption | null>(null);
    const [quickQty, setQuickQty] = React.useState<number | string>(1);
    const [quickDiscPct, setQuickDiscPct] = React.useState<number | string>(0);
    const [quickTaxPct, setQuickTaxPct] = React.useState<number | string>(18);

    // Para limpiar el combobox forzando "remount"
    const [comboKey, setComboKey] = React.useState(0);

    // Acceso al botón/trigger del combobox para Alt+N
    const quickSearchTriggerRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && (e.key === "n" || e.key === "N")) {
                e.preventDefault();
                quickSearchTriggerRef.current?.focus();
                quickSearchTriggerRef.current?.click();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const addQuickSelected = () => {
        if (!quickSelected) {
            toast.error("Selecciona un producto para añadir.");
            return;
        }
        const qty = clamp(quickQty, 0.01);
        const unit = toNum(quickSelected.cost_price) || 0;

        const newItem: PurchaseItemData = {
            id: crypto.randomUUID(),
            product_variant_id: Number(quickSelected.value),
            product_label: quickSelected.label,
            qty_ordered: qty,
            unit_cost: unit,
            discount_pct: clamp(quickDiscPct, 0, 100),
            tax_pct: clamp(quickTaxPct, 0, 100),
        };

        form.setData("items", [newItem, ...form.data.items]);

        // Limpiar barra rápida
        setQuickSelected(null);
        setQuickQty(1);
        setQuickDiscPct(0);
        setQuickTaxPct(18);
        setComboKey((k) => k + 1); // remount combobox -> limpia búsqueda interna y selección
    };

    // ---- Pegado de líneas (SKU, Cant, [Costo]) opcional
    const pasteLines = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;

            // Formato: SKU, Cant, [Costo]
            const rows = text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => l.split(",").map((p) => p.trim()));

            if (rows.length === 0) return;

            // Aquí solo mostramos el patrón. La resolución SKU->variant_id depende de tu backend.
            toast.info("Pegado recibido. (Demo) Integra la resolución de SKU -> variant_id en backend.");
        } catch {
            toast.error("No se pudo leer del portapapeles.");
        }
    };

    // ---- Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = form.data.items.filter((i) => i.product_variant_id && toNum(i.qty_ordered) > 0);
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
                console.error(errs);
                toast.error("Hay errores en el formulario. Revísalo por favor.");
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Compra" />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <form onSubmit={handleSubmit} className="grid gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PackagePlus className="h-5 w-5 text-primary" />
                            <h1 className="text-2xl font-bold">Nueva Compra</h1>
                        </div>
                        <Button type="submit" disabled={form.processing} className="min-w-[140px]">
                            {form.processing ? "Guardando..." : "Guardar borrador"}
                        </Button>
                    </div>

                    {/* Proveedor */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Información del Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Label>Proveedor <span className="text-red-500">*</span></Label>
                                    <SmartCombobox
                                        items={supplierOpts}
                                        value={form.data.supplier_id}
                                        onChange={(v) => form.setData("supplier_id", v as number | null)}
                                        placeholder="Selecciona un proveedor..."
                                        clearable
                                    />
                                    {form.errors.supplier_id && <p className="text-sm text-red-600 mt-1">{form.errors.supplier_id}</p>}
                                </div>
                                <div>
                                    <Label>No. Factura <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.data.invoice_number}
                                        onChange={(e) => form.setData("invoice_number", e.target.value)}
                                        placeholder="FAC-0001"
                                    />
                                    {form.errors.invoice_number && <p className="text-sm text-red-600 mt-1">{form.errors.invoice_number}</p>}
                                </div>
                                <div>
                                    <Label>Fecha Factura</Label>
                                    <Input
                                        type="date"
                                        value={form.data.invoice_date}
                                        onChange={(e) => form.setData("invoice_date", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mt-4">
                                <div>
                                    <Label>Moneda</Label>
                                    <Input value={form.data.currency} readOnly />
                                </div>
                                <div>
                                    <Label>Tasa</Label>
                                    <Input
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        className={NUM_INPUT_CLS}
                                        value={String(form.data.exchange_rate)}
                                        onChange={(e) => form.setData("exchange_rate", clamp(e.target.value, 0))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Barra rápida */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Agregar productos (rápido)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(280px,1fr)_auto_auto_auto_auto] items-center">
                                <AsyncSmartCombobox
                                    key={comboKey}
                                    searchUrl={PurchaseController.searchProducts.url()}
                                    value={quickSelected}
                                    onChange={setQuickSelected}
                                    placeholder="Buscar SKU o nombre (Alt+N para enfocar)"
                                    clearable
                                    refTrigger={quickSearchTriggerRef}
                                />
                                <Input
                                    inputMode="decimal"
                                    className={NUM_INPUT_CLS}
                                    value={String(quickQty)}
                                    onChange={(e) => setQuickQty(clamp(e.target.value, 0.01))}
                                    title="Cantidad"
                                />
                                <Input
                                    inputMode="decimal"
                                    className={NUM_INPUT_CLS}
                                    value={String(quickDiscPct)}
                                    onChange={(e) => setQuickDiscPct(clamp(e.target.value, 0, 100))}
                                    title="% desc por defecto"
                                />
                                <Input
                                    inputMode="decimal"
                                    className={NUM_INPUT_CLS}
                                    value={String(quickTaxPct)}
                                    onChange={(e) => setQuickTaxPct(clamp(e.target.value, 0, 100))}
                                    title="% imp por defecto"
                                />
                                <Button type="button" onClick={addQuickSelected} className="gap-2">
                                    <Plus className="h-4 w-4" /> Añadir
                                </Button>
                            </div>

                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <ClipboardPaste className="h-3.5 w-3.5" />
                                <button type="button" className="underline underline-offset-2" onClick={pasteLines}>
                                    Pega líneas: “SKU, Cant, [Costo]”
                                </button>
                                <span className="opacity-70">(se acumulan si ya existen)</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabla de productos */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Detalle de Productos</CardTitle>
                            <Button type="button" onClick={addItem} size="sm" variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" /> Agregar línea
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[280px]">Producto</TableHead>
                                        <TableHead className="w-[110px] text-right">Cantidad</TableHead>
                                        <TableHead className="w-[140px] text-right">Costo Unit.</TableHead>
                                        <TableHead className="w-[120px] text-right">% Desc.</TableHead>
                                        <TableHead className="w-[120px] text-right">% Imp.</TableHead>
                                        <TableHead className="w-[140px] text-right">Total Línea</TableHead>
                                        <TableHead className="w-[60px]">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {form.data.items.map((item, idx) => (
                                        <TableRow key={item.id || idx}>
                                            <TableCell>
                                                <AsyncSmartCombobox
                                                    searchUrl={PurchaseController.searchProducts.url()}
                                                    value={
                                                        item.product_variant_id
                                                            ? { value: item.product_variant_id, label: item.product_label ?? "" }
                                                            : null
                                                    }
                                                    onChange={(opt) => handleProductChange(idx, opt)}
                                                    placeholder="Buscar por SKU o nombre..."
                                                    clearable
                                                />
                                                {form.errors[`items.${idx}.product_variant_id` as keyof typeof form.errors] && (
                                                    <p className="text-sm text-red-600 mt-1">
                                                        {String(form.errors[`items.${idx}.product_variant_id` as keyof typeof form.errors])}
                                                    </p>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className={NUM_INPUT_CLS}
                                                    value={String(item.qty_ordered)}
                                                    onChange={(e) => handleItemUpdate(idx, { qty_ordered: toNum(e.target.value) })}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className={NUM_INPUT_CLS}
                                                    value={String(item.unit_cost)}
                                                    onChange={(e) => handleItemUpdate(idx, { unit_cost: toNum(e.target.value) })}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className={NUM_INPUT_CLS}
                                                    value={String(item.discount_pct)}
                                                    onChange={(e) => handleItemUpdate(idx, { discount_pct: clamp(e.target.value, 0, 100) })}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className={NUM_INPUT_CLS}
                                                    value={String(item.tax_pct)}
                                                    onChange={(e) => handleItemUpdate(idx, { tax_pct: clamp(e.target.value, 0, 100) })}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right font-medium">
                                                {money(totals.calculatedItems[idx]?.line_total ?? 0)}
                                            </TableCell>

                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(idx)}
                                                    disabled={form.data.items.length <= 1}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Eliminar línea"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Notas y Observaciones</Label>
                            <Textarea
                                id="notes"
                                rows={4}
                                value={form.data.notes}
                                onChange={(e) => form.setData("notes", e.target.value)}
                                placeholder="Observaciones adicionales sobre la compra..."
                                className="resize-none"
                            />
                        </div>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    Resumen de Totales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span className="font-medium">{money(totals.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Descuentos:</span>
                                        <span>- {money(totals.discount_total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Impuestos:</span>
                                        <span className="font-medium">{money(totals.tax_total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="freight" className="text-sm">Flete:</Label>
                                        <Input
                                            id="freight"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-8 w-24 text-right"
                                            value={String(form.data.freight)}
                                            onChange={(e) => form.setData("freight", clamp(e.target.value, 0))}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="other_costs" className="text-sm">Otros costos:</Label>
                                        <Input
                                            id="other_costs"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-8 w-24 text-right"
                                            value={String(form.data.other_costs)}
                                            onChange={(e) => form.setData("other_costs", clamp(e.target.value, 0))}
                                        />
                                    </div>
                                    <Separator className="my-3" />
                                    <div className="flex justify-between font-bold text-lg text-green-700">
                                        <span>TOTAL:</span>
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
