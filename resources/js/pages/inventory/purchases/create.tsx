
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
import { money, purchaseTotals, toNum } from "@/utils/inventory";
import purchases from "@/routes/inventory/purchases";

// 1. Tipo unificado para cada línea de la compra
interface PurchaseItemData {
    product_variant_id: number | null;
    product_label: string;
    qty_ordered: number | string; // Propiedades requeridas
    unit_cost: number | string;
    discount_pct: number | string;
    tax_pct: number | string;
    line_total?: number;
}

interface Props {
    suppliers: Supplier[];
    products: Product[]; // Lista completa de productos con sus variantes
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: purchases.index.url() }, // Ajusta la ruta si es necesario
    { title: "Nueva", href: purchases.create.url() },
];

export default function Create({ suppliers, products }: Props) {
    // 2. Estado ÚNICO para las líneas de la compra
    const [items, setItems] = React.useState<PurchaseItemData[]>([
        { product_variant_id: null, product_label: '', qty_ordered: 1, unit_cost: 0, discount_pct: 0, tax_pct: 0 },
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
    });

    const supplierOpts: ItemOption[] = React.useMemo(() => suppliers.map(s => ({ value: s.id, label: s.name })), [suppliers]);

    // 3. Opciones de productos ahora basadas en VARIANTES
    const productOpts: ItemOption[] = React.useMemo(() =>
        products.flatMap(p =>
            p.variants.map(v => ({
                value: v.id, // Usamos el ID de la variante
                label: `${p.name} ${v.attributes ? `(${Object.values(v.attributes).join(' ')})` : ''} (SKU: ${v.sku})`
            }))
        )
        , [products]);

    // 4. Funciones de actualización simplificadas
    const updateRow = (idx: number, patch: Partial<PurchaseItemData>) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
    };

    const handleProductChange = (idx: number, variantId: number | null) => {
        const product = products.find(p => p.variants.some(v => v.id === variantId));
        const variant = product?.variants.find(v => v.id === variantId);

        updateRow(idx, {
            product_variant_id: variantId,
            product_label: productOpts.find(opt => opt.value === variantId)?.label || '',
            unit_cost: toNum(variant?.cost_price) || 0,
        });
    };

    const addRow = () => {
        setItems(prev => [...prev, { product_variant_id: null, product_label: '', qty_ordered: 1, unit_cost: 0, discount_pct: 0, tax_pct: 0 }]);
    };

    const removeRow = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const { grand_total, subtotal, tax_total, discount_total, calculatedItems } = purchaseTotals(items, form.data.freight, form.data.other_costs);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(item => item.product_variant_id && toNum(item.qty_ordered) > 0);

        if (!form.data.supplier_id || finalItems.length === 0) {
            toast.error("Completa el proveedor y al menos una línea de producto válida.");
            return;
        }

        const payload = {
            ...form.data,
            items: finalItems.map(item => ({
                product_variant_id: item.product_variant_id,
                qty_ordered: toNum(item.qty_ordered),
                unit_cost: toNum(item.unit_cost),
                discount_pct: toNum(item.discount_pct),
                tax_pct: toNum(item.tax_pct),
            })),
        };

        router.post("/inventory/purchases", payload, { // Usando ruta estática por simplicidad
            onSuccess: () => toast.success("Compra creada (borrador)"),
            onError: (errors) => {
                console.error(errors);
                toast.error("Revisa los campos marcados. Hubo un error al guardar.");
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Compra" />
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <form onSubmit={onSubmit} className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PackagePlus className="h-5 w-5" />
                            <h1 className="text-xl font-semibold">Nueva Compra</h1>
                        </div>
                        <Button type="submit" disabled={form.processing}>Guardar borrador</Button>
                    </div>

                    <Card className="shadow-sm">
                        <CardHeader><CardTitle>Encabezado</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Label>Proveedor</Label>
                                    <SmartCombobox items={supplierOpts} value={form.data.supplier_id} onChange={(v) => form.setData("supplier_id", v as number | null)} placeholder="Selecciona proveedor" />
                                </div>
                                <div><Label>No. Factura</Label><Input value={form.data.invoice_number} onChange={(e) => form.setData("invoice_number", e.target.value)} placeholder="FAC-0001" /></div>
                                <div><Label>Fecha factura</Label><Input type="date" value={form.data.invoice_date} onChange={(e) => form.setData("invoice_date", e.target.value)} /></div>
                            </div>
                        </CardContent>
                    </Card>

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
                                        {items.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell><SmartCombobox items={productOpts} value={item.product_variant_id} onChange={(v) => handleProductChange(idx, v as number | null)} /></TableCell>
                                                <TableCell><Input inputMode="decimal" className="text-right" value={String(item.qty_ordered)} onChange={(e) => updateRow(idx, { qty_ordered: toNum(e.target.value) })} /></TableCell>
                                                <TableCell><Input inputMode="decimal" className="text-right" value={String(item.unit_cost)} onChange={(e) => updateRow(idx, { unit_cost: toNum(e.target.value) })} /></TableCell>
                                                <TableCell><Input inputMode="decimal" className="text-right" value={String(item.discount_pct)} onChange={(e) => updateRow(idx, { discount_pct: toNum(e.target.value) })} /></TableCell>
                                                <TableCell><Input inputMode="decimal" className="text-right" value={String(item.tax_pct)} onChange={(e) => updateRow(idx, { tax_pct: toNum(e.target.value) })} /></TableCell>
                                                <TableCell className="text-right font-medium">{money(calculatedItems.find(ci => ci.product_variant_id === item.product_variant_id)?.line_total || 0)}</TableCell>
                                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="md:col-span-2">
                            <Label>Notas</Label>
                            <Textarea rows={4} value={form.data.notes} onChange={(e) => form.setData("notes", e.target.value)} placeholder="Observaciones de la compra" />
                        </div>
                        <Card className="shadow-sm">
                            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Totales</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                    <div className="flex justify-between"><span>Descuentos</span><span>- {money(discount_total)}</span></div>
                                    <div className="flex justify-between"><span>Impuestos</span><span>{money(tax_total)}</span></div>
                                    <div className="flex justify-between"><span>Flete</span><Input type="number" step="0.01" className="h-6 max-w-[100px] text-right" value={form.data.freight} onChange={(e) => form.setData("freight", toNum(e.target.value))} /></div>
                                    <div className="flex justify-between"><span>Otros costos</span><Input type="number" step="0.01" className="h-6 max-w-[100px] text-right" value={form.data.other_costs} onChange={(e) => form.setData("other_costs", toNum(e.target.value))} /></div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{money(grand_total)}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}