
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, useForm, router } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, DollarSign, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import type { BreadcrumbItem, Supplier, Product } from "@/types";
import { SmartCombobox, type ItemOption } from "./partials/smart-combobox";
import { money, purchaseTotals, toNum, type PurchaseLine } from "@/utils/inventory";
import purchases from "@/routes/inventory/purchases";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// Tipos mínimos (ajusta si ya los tienes)

interface PurchaseItemData extends PurchaseLine {
    product_variant_id: number | null;
    product_label: string; // Para mostrar el nombre del producto en la tabla
}

interface Props {
    suppliers: Supplier[];
    products: Product[]; // Lista completa de productos con sus variantes
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: purchases.index.url() },
    { title: "Nueva", href: purchases.index.url() },
];

export default function Create({ suppliers, products }: Props) {
    const [items, setItems] = React.useState<PurchaseItemData[]>([
        { product_variant_id: null, product_label: '', qty_ordered: 1, unit_cost: 0, discount_pct: 0, tax_pct: 0 } as PurchaseItemData,
    ]);

    const form = useForm({
        supplier_id: null as number | null,
        invoice_number: "",
        invoice_date: "",
        currency: "DOP",
        exchange_rate: 1,
        freight: 0,
        other_costs: 0,
        notes: "",
        // items se envían aparte
    });

    const supplierOpts: ItemOption[] = React.useMemo(() => suppliers.map(s => ({ value: s.id, label: s.name })), [suppliers]);
    const productOpts: ItemOption[] = React.useMemo(() => {
        return products.flatMap(p =>
            p.variants.map(v => ({
                value: v.id, // El valor ahora es el ID de la variante
                label: `${p.name} ${v.attributes ? `(${Object.values(v.attributes).join(' ')})` : ''} (SKU: ${v.sku})`
            }))
        );
    }, [products]);

    // Guardamos el id del producto en un arreglo paralelo para no mezclar tipos del util PurchaseLine
    // const [productIds, setProductIds] = React.useState<(number | null)[]>([null]);

    const updateRow = (idx: number, patch: Partial<PurchaseItemData>) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
    };

    const handleProductChange = (idx: number, variantId: number | null) => {
        const selectedOpt = productOpts.find(opt => opt.value === variantId);
        updateRow(idx, {
            product_variant_id: variantId,
            product_label: selectedOpt ? selectedOpt.label : ''
        });
    };
    // const updateRowProduct = (idx: number, productId: number | null) => setProductIds(prev => prev.map((v, i) => i === idx ? productId : v));
    const addRow = () => {
        setItems(prev => [...prev, { product_variant_id: null, product_label: '', qty_ordered: 1, unit_cost: 0, discount_pct: 0, tax_pct: 0 } as PurchaseItemData]);
    };
    const removeRow = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const t = purchaseTotals(items, form.data.freight, form.data.other_costs);
    const canSubmit = form.data.supplier_id && items.every(item => item.product_variant_id && toNum(item.qty_ordered) > 0);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) { toast.error("Completa proveedor y al menos una línea válida"); return; }

        const payload = {
            ...form.data,
            items: items.map(item => ({
                product_variant_id: item.product_variant_id,
                qty_ordered: toNum(item.qty_ordered),
                unit_cost: toNum(item.unit_cost),
                discount_pct: toNum(item.discount_pct),
                tax_pct: toNum(item.tax_pct),
            })),
        };

        router.post(PurchaseController.store.url(), payload, {
            preserveState: true,
            onSuccess: () => toast.success("Compra creada (borrador)"),
            onError: () => toast.error("Revisa los campos marcados"),
        });
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Compra" />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <div className="mb-4 flex items-center gap-2">
                    <PackagePlus className="h-5 w-5" />
                    <h1 className="text-xl font-semibold">Nueva Compra</h1>
                </div>

                <form onSubmit={onSubmit} className="grid gap-6">
                    {/* Encabezado */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Encabezado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Label>Proveedor</Label>
                                    <SmartCombobox items={supplierOpts} value={form.data.supplier_id} onChange={(v) => form.setData("supplier_id", typeof v === 'string' ? Number(v) : v)} placeholder="Selecciona proveedor" />
                                </div>
                                <div>
                                    <Label>No. Factura</Label>
                                    <Input value={form.data.invoice_number} onChange={(e) => form.setData("invoice_number", e.target.value)} placeholder="FAC-0001" />
                                </div>
                                <div>
                                    <Label>Fecha factura</Label>
                                    <Input type="date" value={form.data.invoice_date as string} onChange={(e) => form.setData("invoice_date", e.target.value)} />
                                </div>
                                <div>
                                    <Label>Moneda</Label>
                                    <Input value={form.data.currency} onChange={(e) => form.setData("currency", e.target.value.toUpperCase().slice(0, 3))} />
                                </div>
                                <div>
                                    <Label>Tasa</Label>
                                    <Input type="number" step="0.000001" value={form.data.exchange_rate} onChange={(e) => form.setData("exchange_rate", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label>Flete / otros</Label>
                                    <Input type="number" step="0.01" value={form.data.freight} onChange={(e) => form.setData("freight", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label>Otros costos</Label>
                                    <Input type="number" step="0.01" value={form.data.other_costs} onChange={(e) => form.setData("other_costs", Number(e.target.value))} />
                                </div>
                                <div className="md:col-span-4">
                                    <Label>Notas</Label>
                                    <Textarea rows={2} value={form.data.notes as string} onChange={(e) => form.setData("notes", e.target.value)} placeholder="Observaciones de la compra" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detalle */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Detalle de ítems</CardTitle>
                            <Button type="button" onClick={addRow} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Agregar línea</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[240px]">Producto</TableHead>
                                            <TableHead className="w-[110px] text-right">Cantidad</TableHead>
                                            <TableHead className="w-[140px] text-right">Costo</TableHead>
                                            <TableHead className="w-[120px] text-right">Desc. %</TableHead>
                                            <TableHead className="w-[120px] text-right">Imp. %</TableHead>
                                            <TableHead className="w-[140px] text-right">Total línea</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => {
                                            const total = money((item.qty_ordered && item.unit_cost) ? (toNum(item.qty_ordered) * toNum(item.unit_cost) - (toNum(item.discount_amount ?? 0) || (toNum(item.qty_ordered) * toNum(item.unit_cost) * toNum(item.discount_pct ?? 0) / 100)) + ((toNum(item.qty_ordered) * toNum(item.unit_cost) - (toNum(item.discount_amount ?? 0) || (toNum(item.qty_ordered) * toNum(item.unit_cost) * toNum(item.discount_pct ?? 0) / 100))) * toNum(item.tax_pct ?? 0) / 100)) : 0);
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell>
                                                        {/* 6. El combobox ahora llama a handleProductChange */}
                                                        <SmartCombobox
                                                            items={productOpts}
                                                            value={item.product_variant_id}
                                                            onChange={(v) => handleProductChange(idx, typeof v === 'string' ? Number(v) : v)}
                                                            placeholder="Selecciona producto"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input inputMode="decimal" className="text-right" value={String(item.qty_ordered ?? "")} onChange={(e) => updateRow(idx, { qty_ordered: e.target.value })} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input inputMode="decimal" className="text-right" value={String(item.unit_cost ?? "")} onChange={(e) => updateRow(idx, { unit_cost: e.target.value })} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input inputMode="decimal" className="text-right" value={String(item.discount_pct ?? 0)} onChange={(e) => updateRow(idx, { discount_pct: e.target.value })} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input inputMode="decimal" className="text-right" value={String(item.tax_pct ?? 0)} onChange={(e) => updateRow(idx, { tax_pct: e.target.value })} />
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{total}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {items.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                    No hay líneas. Agrega productos con el botón "Agregar línea".
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Totales */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="shadow-sm md:col-start-3">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Totales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
                                    <div className="flex justify-between"><span>Descuentos</span><span>- {money(t.discount_total)}</span></div>
                                    <div className="flex justify-between"><span>Impuestos</span><span>{money(t.tax_total)}</span></div>
                                    <div className="flex justify-between"><span>Flete</span><span>{money(form.data.freight)}</span></div>
                                    <div className="flex justify-between"><span>Otros costos</span><span>{money(form.data.other_costs)}</span></div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{money(t.grand_total)}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button type="submit" className="gap-2">Guardar borrador</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
