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
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// 1. Interfaces mejoradas con validación
interface PurchaseItemData {
    id?: string; // Para tracking de React
    product_variant_id: number | null;
    product_label: string;
    qty_ordered: number | string;
    unit_cost: number | string;
    discount_pct: number | string;
    tax_pct: number | string;
    line_total?: number;
}

interface Props {
    suppliers: Supplier[];
    products: Product[];
}

interface FormData {
    supplier_id: number | null;
    invoice_number: string;
    invoice_date: string;
    currency: string;
    exchange_rate: number;
    freight: number;
    other_costs: number;
    notes: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: purchases.index.url() },
    { title: "Nueva", href: purchases.create.url() },
];

// 2. Hook personalizado para gestión de ítems
const usePurchaseItems = (products: Product[]) => {
    const [items, setItems] = React.useState<PurchaseItemData[]>([
        createEmptyItem()
    ]);

    function createEmptyItem(): PurchaseItemData {
        return {
            id: crypto.randomUUID(),
            product_variant_id: null,
            product_label: '',
            qty_ordered: 1,
            unit_cost: 0,
            discount_pct: 0,
            tax_pct: 0
        };
    }

    const updateItem = React.useCallback((idx: number, patch: Partial<PurchaseItemData>) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
    }, []);

    const handleProductChange = React.useCallback((idx: number, variantId: number | null) => {
        if (!variantId) {
            updateItem(idx, {
                product_variant_id: null,
                product_label: '',
                unit_cost: 0,
            });
            return;
        }

        const product = products.find(p => p.variants.some(v => v.id === variantId));
        const variant = product?.variants.find(v => v.id === variantId);

        if (variant) {
            const label = `${product!.name} ${variant.attributes ? `(${Object.values(variant.attributes).join(' ')})` : ''} (SKU: ${variant.sku})`;

            updateItem(idx, {
                product_variant_id: variantId,
                product_label: label,
                unit_cost: toNum(variant.cost_price) || 0,
            });
        }
    }, [products, updateItem]);

    const addItem = React.useCallback(() => {
        setItems(prev => [...prev, createEmptyItem()]);
    }, []);

    const removeItem = React.useCallback((idx: number) => {
        setItems(prev => {
            if (prev.length <= 1) {
                toast.error("Debe mantener al menos una línea de producto");
                return prev;
            }
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    return {
        items,
        updateItem,
        handleProductChange,
        addItem,
        removeItem
    };
};

// 3. Hook para opciones de productos con memoización
const useProductOptions = (products: Product[]): ItemOption[] => {
    return React.useMemo(() =>
        products.flatMap(p =>
            p.variants.map(v => ({
                value: v.id,
                label: `${p.name} ${v.attributes ? `(${Object.values(v.attributes).join(' ')})` : ''} (SKU: ${v.sku})`
            }))
        ), [products]);
};

// 4. Validaciones
const validateForm = (formData: FormData, items: PurchaseItemData[]) => {
    const errors: string[] = [];

    if (!formData.supplier_id) {
        errors.push("Debe seleccionar un proveedor");
    }

    if (!formData.invoice_number.trim()) {
        errors.push("El número de factura es requerido");
    }

    const validItems = items.filter(item =>
        item.product_variant_id &&
        toNum(item.qty_ordered) > 0 &&
        toNum(item.unit_cost) >= 0
    );

    if (validItems.length === 0) {
        errors.push("Debe agregar al menos una línea de producto válida");
    }

    // Validar líneas individuales
    items.forEach((item, index) => {
        if (item.product_variant_id) {
            if (toNum(item.qty_ordered) <= 0) {
                errors.push(`Línea ${index + 1}: La cantidad debe ser mayor a 0`);
            }
            if (toNum(item.unit_cost) < 0) {
                errors.push(`Línea ${index + 1}: El costo no puede ser negativo`);
            }
            if (toNum(item.discount_pct) < 0 || toNum(item.discount_pct) > 100) {
                errors.push(`Línea ${index + 1}: El descuento debe estar entre 0% y 100%`);
            }
            if (toNum(item.tax_pct) < 0) {
                errors.push(`Línea ${index + 1}: El impuesto no puede ser negativo`);
            }
        }
    });

    return errors;
};

// 5. Componente principal optimizado
export default function Create({ suppliers, products }: Props) {
    const {
        items,
        updateItem,
        handleProductChange,
        addItem,
        removeItem
    } = usePurchaseItems(products);

    const form = useForm<FormData>({
        supplier_id: null,
        invoice_number: "",
        invoice_date: new Date().toISOString().split('T')[0], // Fecha actual por defecto
        currency: "DOP",
        exchange_rate: 1,
        freight: 0,
        other_costs: 0,
        notes: "",
    });

    const supplierOpts: ItemOption[] = React.useMemo(() =>
        suppliers.map(s => ({ value: s.id, label: s.name })),
        [suppliers]
    );

    const productOpts = useProductOptions(products);

    // 6. Cálculos con memoización
    const totals = React.useMemo(() =>
        purchaseTotals(items, form.data.freight, form.data.other_costs),
        [items, form.data.freight, form.data.other_costs]
    );

    // 7. Manejo de submit mejorado
    const handleSubmit = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateForm(form.data, items);

        if (validationErrors.length > 0) {
            validationErrors.forEach(error => toast.error(error));
            return;
        }

        const validItems = items.filter(item =>
            item.product_variant_id && toNum(item.qty_ordered) > 0
        );

        const payload = {
            ...form.data,
            items: validItems.map(item => ({
                product_variant_id: item.product_variant_id!,
                qty_ordered: toNum(item.qty_ordered),
                unit_cost: toNum(item.unit_cost),
                discount_pct: toNum(item.discount_pct),
                tax_pct: toNum(item.tax_pct),
            })),
        };

        router.post(PurchaseController.store.url(), payload, {
            onSuccess: () => {
                toast.success("Compra creada exitosamente");
            },
            onError: (errors) => {
                console.error("Errores de validación:", errors);
                Object.values(errors).flat().forEach(error =>
                    toast.error(typeof error === 'string' ? error : 'Error de validación')
                );
            },
        });
    }, [form.data, items]);

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
                        <CardHeader>
                            <CardTitle>Información del Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="supplier">
                                        Proveedor <span className="text-red-500">*</span>
                                    </Label>
                                    <SmartCombobox
                                        items={supplierOpts}
                                        value={form.data.supplier_id}
                                        onChange={(v) => form.setData("supplier_id", v as number | null)}
                                        placeholder="Selecciona un proveedor..."
                                        error={form.errors.supplier_id}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="invoice_number">
                                        No. Factura <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="invoice_number"
                                        required
                                        value={form.data.invoice_number}
                                        onChange={(e) => form.setData("invoice_number", e.target.value)}
                                        placeholder="FAC-0001"

                                    />
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
                    <Card className="shadow-sm">
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
                            <div className="overflow-x-auto">
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
                                        {items.map((item, idx) => (
                                            <TableRow key={item.id || idx}>
                                                <TableCell>
                                                    <SmartCombobox
                                                        items={productOpts}
                                                        value={item.product_variant_id}
                                                        onChange={(v) => handleProductChange(idx, v as number | null)}
                                                        placeholder="Seleccionar producto..."
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        className="text-right"
                                                        value={String(item.qty_ordered)}
                                                        onChange={(e) => updateItem(idx, { qty_ordered: toNum(e.target.value) })}
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
                                                        onChange={(e) => updateItem(idx, { unit_cost: toNum(e.target.value) })}
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
                                                        onChange={(e) => updateItem(idx, { discount_pct: toNum(e.target.value) })}
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
                                                        onChange={(e) => updateItem(idx, { tax_pct: toNum(e.target.value) })}
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
                                                        disabled={items.length <= 1}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
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