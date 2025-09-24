import * as React from "react";
import { Head, useForm } from "@inertiajs/react";

// --- LAYOUT, COMPONENTS, HOOKS & ICONS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package, ArrowLeftRight, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { AsyncSmartCombobox, type ItemOption } from "@/pages/inventory/purchases/partials/AsyncSmartCombobox";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem } from "@/types";
import { toNum } from "@/utils/inventory";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";
import ProductController from "@/actions/App/Http/Controllers/Inventory/ProductController"; // Asumiendo que tienes una ruta de búsqueda aquí

// --- Interfaces ---
interface AdjustmentItemData {
    id: string; // ID de React para la key
    product_variant_id: number | null;
    product_label: string;
    sku: string;
    previous_quantity: number;
    new_quantity: number | string;
}

interface FormData {

    reason: string;
    adjustment_date: string;
    notes: string;
    items: AdjustmentItemData[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Ajustes de Inventario", href: "#" }, // Cambiar a la ruta del index cuando exista
    { title: "Nuevo", href: InventoryAdjustmentController.create.url() },
];

function createEmptyItem(): AdjustmentItemData {
    return {
        id: crypto.randomUUID(),
        product_variant_id: null,
        product_label: '',
        sku: '',
        previous_quantity: 0,
        new_quantity: '', // Se deja vacío para que el usuario lo llene
    };
}

export default function CreateInventoryAdjustment() {
    const form = useForm<FormData>({

        reason: '',
        adjustment_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: [createEmptyItem()],
    });

    // --- Lógica del formulario ---
    const handleItemUpdate = (idx: number, patch: Partial<AdjustmentItemData>) => {
        form.setData('items', form.data.items.map((item, i) => i === idx ? { ...item, ...patch } : item));
    };

    const handleProductChange = (idx: number, selectedOption: ItemOption | null) => {
        if (!selectedOption) {
            handleItemUpdate(idx, { product_variant_id: null, product_label: '', sku: '', previous_quantity: 0, new_quantity: '' });
            return;
        }
        handleItemUpdate(idx, {
            product_variant_id: selectedOption.value as number,
            product_label: selectedOption.label,
            sku: selectedOption.sku,
            previous_quantity: toNum(selectedOption.stock_quantity), // Asumimos que la API devuelve el stock actual
            new_quantity: toNum(selectedOption.stock_quantity), // Por defecto, la nueva cantidad es la actual
        });
    };

    const addItem = () => form.setData('items', [...form.data.items, createEmptyItem()]);

    const removeItem = (idx: number) => {
        if (form.data.items.length <= 1) {
            toast.error("Debe mantener al menos una línea de producto");
            return;
        }
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    };

    // ... dentro del componente CreateInventoryAdjustment ...

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validItems = form.data.items.filter(item =>
            item.product_variant_id && item.new_quantity !== ''
        );

        if (validItems.length === 0) {
            toast.error("Debe agregar al menos un producto con una cantidad final válida.");
            return;
        }

        const payload = { ...form.data, items: validItems };

        // CORRECCIÓN 1: Separar .transform() de .post()
        form.transform(() => payload);
        form.post(InventoryAdjustmentController.store.url(), {
            onSuccess: () => toast.success("Ajuste de inventario guardado exitosamente."),
            // CORRECCIÓN 2: Añadir el tipo al parámetro 'errs'
            onError: (errs: Record<string, string>) => toast.error("Hubo un error al guardar el ajuste.", {
                description: Object.values(errs).flat().join(" "),
            }),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Ajuste de Inventario" />
            <div className="mx-auto max-w-4xl p-4 md:p-6">
                <form onSubmit={handleSubmit} className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PackagePlus className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold">Nuevo Ajuste de Inventario</h1>
                        </div>
                        <Button type="submit" disabled={form.processing || !form.isDirty}>
                            {form.processing ? "Guardando..." : "Guardar Ajuste"}
                        </Button>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Detalles del Ajuste</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="adjustment_date">Fecha del Ajuste <span className="text-red-500">*</span></Label>
                                <Input id="adjustment_date" type="date" value={form.data.adjustment_date} onChange={(e) => form.setData("adjustment_date", e.target.value)} />
                                {form.errors.adjustment_date && <p className="text-sm text-red-600 mt-1">{form.errors.adjustment_date}</p>}
                            </div>
                            <div>
                                <Label htmlFor="reason">Motivo <span className="text-red-500">*</span></Label>
                                <Input id="reason" value={form.data.reason} onChange={(e) => form.setData("reason", e.target.value)} placeholder="Ej: Conteo físico mensual" />
                                {form.errors.reason && <p className="text-sm text-red-600 mt-1">{form.errors.reason}</p>}
                            </div>
                            <div className="md:col-span-3">
                                <Label htmlFor="notes">Notas Adicionales</Label>
                                <Textarea id="notes" value={form.data.notes} onChange={(e) => form.setData("notes", e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Productos a Ajustar</CardTitle>
                            <Button type="button" onClick={addItem} size="sm" variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" /> Agregar Producto
                            </Button>
                        </CardHeader>
                        <CardContent>
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
                                        const adjustment = toNum(item.new_quantity) - toNum(item.previous_quantity);


                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <AsyncSmartCombobox
                                                        searchUrl={ProductController.search.url()} // Necesitarás crear esta ruta/método
                                                        value={item.product_variant_id ? { value: item.product_variant_id, label: item.product_label } : null}
                                                        onChange={(option) => handleProductChange(idx, option)}
                                                        placeholder="Buscar por SKU o nombre..."
                                                    />
                                                    {form.errors[`items.${idx}.product_variant_id`] && <p className="text-sm text-red-600 mt-1">{form.errors[`items.${idx}.product_variant_id`]}</p>}
                                                </TableCell>
                                                <TableCell className="text-right">{item.previous_quantity}</TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" value={String(item.new_quantity)} onChange={(e) => handleItemUpdate(idx, { new_quantity: e.target.value })} className="text-right" />
                                                    {form.errors[`items.${idx}.new_quantity`] && <p className="text-sm text-red-600 mt-1">{form.errors[`items.${idx}.new_quantity`]}</p>}
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${adjustment > 0 ? 'text-green-600' : adjustment < 0 ? 'text-red-600' : ''}`}>
                                                    {adjustment !== 0 ? `${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}` : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={form.data.items.length <= 1} className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}