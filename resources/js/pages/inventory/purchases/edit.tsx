import * as React from "react";
import { Head, useForm, Link } from "@inertiajs/react";

// --- LAYOUT, COMPONENTS & HOOKS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, DollarSign, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AsyncSmartCombobox, type ItemOption } from "./partials/AsyncSmartCombobox";
import { SmartCombobox } from "./partials/smart-combobox";

// --- UTILS, TYPES & ACTIONS ---
import { money, purchaseTotals, toNum } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import type { BreadcrumbItem, Purchase, Supplier } from "@/types";
import { Separator } from "@/components/ui/separator";

// --- Interfaces ---
interface PurchaseItemData {
    id?: number | null; // <-- ID es importante para actualizar
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
    purchase: Purchase;
    suppliers: Supplier[];
}

export default function EditPurchase({ purchase, suppliers }: Props) {
    const form = useForm<FormData>({
        supplier_id: purchase.supplier_id,
        invoice_number: purchase.invoice_number || "",
        invoice_date: purchase.invoice_date ? new Date(purchase.invoice_date).toISOString().split('T')[0] : "",
        currency: purchase.currency,
        exchange_rate: purchase.exchange_rate,
        freight: purchase.freight,
        other_costs: purchase.other_costs,
        notes: purchase.notes || "",
        items: purchase.items.map(item => ({
            id: item.id,
            product_variant_id: item.product_variant_id,
            product_label: `${item.product_variant.product.name} (SKU: ${item.product_variant.sku})`,
            qty_ordered: item.qty_ordered,
            unit_cost: item.unit_cost,
            discount_pct: item.discount_pct,
            tax_pct: item.tax_pct,
        })),
    });

    // --- Lógica del formulario (casi idéntica a 'create') ---

    const supplierOpts: ItemOption[] = React.useMemo(() =>
        suppliers.map(s => ({ value: s.id, label: s.name })),
        [suppliers]
    );

    const totals = React.useMemo(() =>
        purchaseTotals(form.data.items, form.data.freight, form.data.other_costs),
        [form.data.items, form.data.freight, form.data.other_costs]
    );

    const handleItemUpdate = (idx: number, patch: Partial<PurchaseItemData>) => {
        form.setData('items', form.data.items.map((item, i) => i === idx ? { ...item, ...patch } : item));
    };

    const handleProductChange = (idx: number, selectedOption: ItemOption | null) => {
        handleItemUpdate(idx, {
            product_variant_id: selectedOption ? selectedOption.value as number : null,
            product_label: selectedOption ? selectedOption.label : '',
            unit_cost: selectedOption ? toNum(selectedOption.cost_price) || 0 : 0,
        });
    };

    const addItem = () => {
        form.setData('items', [...form.data.items, { id: null, product_variant_id: null, qty_ordered: 1, unit_cost: 0, discount_pct: 0, tax_pct: 0 }]);
    };

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) {
            toast.error("Debe mantener al menos una línea de producto");
            return;
        }
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...form.data,
            items: form.data.items.filter(item => item.product_variant_id && toNum(item.qty_ordered) > 0),
        };

        form.transform(() => payload);
        form.put(PurchaseController.update.url({ purchase: purchase.id }), {
            onSuccess: () => toast.success("Compra actualizada exitosamente"),
            onError: (errs) => toast.error("Hubo un error", { description: Object.values(errs).flat().join(" ") }),
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Compras", href: PurchaseController.index.url() },
        { title: purchase.code, href: PurchaseController.show.url({ purchase: purchase.id }) },
        { title: "Editar", href: "#" },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Compra ${purchase.code}`} />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <form onSubmit={handleSubmit} className="grid gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <h1 className="text-2xl font-bold">Editar Compra</h1>
                        </div>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="min-w-[120px]"
                        >
                            {form.processing ? "Guardando..." : "Guardar borrador"}
                        </Button>
                    </div>
                    {/* Supplier Info Card */}
                    <Card className="shadow-sm">
                        <CardHeader><CardTitle>Información del Proveedor</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="supplier">Proveedor <span className="text-red-500">*</span></Label>
                                    <SmartCombobox
                                        items={supplierOpts}
                                        value={form.data.supplier_id}
                                        onChange={(v) => form.setData("supplier_id", v as number | null)}
                                        placeholder="Selecciona un proveedor..."
                                    />
                                    {form.errors.supplier_id && <p className="text-sm text-red-600 mt-1">{form.errors.supplier_id}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="invoice_number">No. Factura <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="invoice_number"
                                        value={form.data.invoice_number}
                                        onChange={(e) => form.setData("invoice_number", e.target.value)}
                                        placeholder="FAC-0001"
                                    />
                                    {form.errors.invoice_number && <p className="text-sm text-red-600 mt-1">{form.errors.invoice_number}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="invoice_date">Fecha Factura</Label>
                                    <Input
                                        id="invoice_date"
                                        type="date"
                                        value={form.data.invoice_date}
                                        onChange={(e) => form.setData("invoice_date", e.target.value)}

                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Table */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Detalle de Productos</CardTitle>
                            <Button
                                type="button"
                                onClick={addItem}
                                size="sm"
                                variant="outline"
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar línea
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[280px]">Producto</TableHead>
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
                                        <TableRow key={item.id || idx}>
                                            <TableCell>
                                                <AsyncSmartCombobox
                                                    searchUrl={PurchaseController.searchProducts.url()}
                                                    // Pasamos el item completo si lo tenemos, si no, null
                                                    value={item.product_variant_id ? { value: item.product_variant_id, label: item.product_label! } : null}
                                                    onChange={(option) => handleProductChange(idx, option)}
                                                    placeholder="Buscar por SKU o nombre..."
                                                />
                                                {form.errors[`items.${idx}.product_variant_id`] && <p className="text-sm text-red-600 mt-1">{form.errors[`items.${idx}.product_variant_id`]}</p>}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className="text-right"
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
                                                    className="text-right"
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
                                                    className="text-right"
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
                                                    className="text-right"
                                                    value={String(item.tax_pct)}
                                                    onChange={(e) => handleItemUpdate(idx, { tax_pct: toNum(e.target.value) })}
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {money(totals.calculatedItems[idx]?.line_total || 0)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(idx)}
                                                    disabled={form.data.items.length <= 1}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

                    {/* Notes and Totals */}
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
                                            value={form.data.freight}
                                            onChange={(e) => form.setData("freight", toNum(e.target.value))}
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
                                            value={form.data.other_costs}
                                            onChange={(e) => form.setData("other_costs", toNum(e.target.value))}
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