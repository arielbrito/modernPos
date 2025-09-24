import * as React from "react";
import { Head, useForm, router } from "@inertiajs/react";
import { useDebounce } from "use-debounce";

// --- LAYOUT & COMPONENTS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/pagination";
import { toast } from "sonner";
import { Package, Filter, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, Category, Paginated, Supplier, ProductVariant } from "@/types";
import { toNum } from "@/utils/inventory";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";

// --- Interfaces ---
interface AdjustmentItemData {
    product_variant_id: number;
    product_label: string;
    sku: string;
    previous_quantity: number;
    new_quantity: number | string;
    is_dirty: boolean;
}

interface FormData {
    reason: string;
    adjustment_date: string;
    notes: string;
    items: AdjustmentItemData[];
}

interface Props {
    variants: Paginated<ProductVariant & { stock_quantity: number | null }>;
    filters: { term?: string; category_id?: string; supplier_id?: string; };
    filterOptions: {
        categories: Category[];
        suppliers: Supplier[];
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Ajustes de Inventario", href: "#" },
    { title: "Ajuste Masivo", href: InventoryAdjustmentController.bulkCreate.url() },
];

// --- Helper para mostrar el valor del ajuste ---
const AdjustmentValue = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground">—</span>;
    const isPositive = value > 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const Icon = isPositive ? ArrowUp : ArrowDown;

    return (
        <div className={cn("flex items-center justify-end gap-2 font-bold", color)}>
            <Icon className="h-4 w-4" />
            <span>{isPositive ? '+' : ''}{value.toFixed(2)}</span>
        </div>
    );
};


export default function BulkCreateInventoryAdjustment({ variants, filters, filterOptions }: Props) {
    const form = useForm<FormData>({
        reason: '',
        adjustment_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: [],
    });

    const [localFilters, setLocalFilters] = React.useState(filters);
    const [debouncedFilters] = useDebounce(localFilters, 300);

    React.useEffect(() => {
        const itemsFromProps = variants.data.map(variant => ({
            product_variant_id: variant.id,
            product_label: `${variant.product.name} ${variant.attributes ? `(${Object.values(variant.attributes).join(' ')})` : ''}`,
            sku: variant.sku,
            previous_quantity: toNum(variant.stock_quantity),
            new_quantity: toNum(variant.stock_quantity),
            is_dirty: false,
        }));
        form.setData('items', itemsFromProps);
    }, [variants.data]);

    React.useEffect(() => {
        router.get(InventoryAdjustmentController.bulkCreate.url(), debouncedFilters, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    }, [debouncedFilters]);

    const handleItemChange = (id: number, newQuantity: string) => {
        form.setData('items', form.data.items.map(item =>
            item.product_variant_id === id
                ? { ...item, new_quantity: newQuantity, is_dirty: true }
                : item
        ));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dirtyItems = form.data.items.filter(item => item.is_dirty && toNum(item.new_quantity) !== item.previous_quantity);

        if (dirtyItems.length === 0) {
            toast.info("No se han realizado cambios en el inventario.");
            return;
        }

        const payload = { ...form.data, items: dirtyItems };

        form.transform(() => payload);
        form.post(InventoryAdjustmentController.bulkStore.url(), {
            onSuccess: () => toast.success("Ajuste de inventario masivo guardado."),
            onError: (errs: Record<string, string>) => toast.error("Error al guardar el ajuste.", { description: Object.values(errs).flat().join(" ") }),
        });
    };

    const dirtyItemsCount = form.data.items.filter(item => item.is_dirty).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ajuste Masivo de Inventario" />
            <form onSubmit={handleSubmit} className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 z-10 border-b">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Ajuste Masivo de Inventario</h1>
                    </div>
                    <Button type="submit" disabled={form.processing || !form.isDirty}>
                        {form.processing ? "Guardando..." : `Guardar Ajuste (${dirtyItemsCount} Cambios)`}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="reason">Motivo <span className="text-red-500">*</span></Label>
                                    <Input id="reason" value={form.data.reason} onChange={e => form.setData('reason', e.target.value)} placeholder="Ej: Conteo físico" />
                                    {form.errors.reason && <p className="text-sm text-red-600 mt-1">{form.errors.reason}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="adjustment_date">Fecha <span className="text-red-500">*</span></Label>
                                    <Input id="adjustment_date" type="date" value={form.data.adjustment_date} onChange={e => form.setData('adjustment_date', e.target.value)} />
                                    {form.errors.adjustment_date && <p className="text-sm text-red-600 mt-1">{form.errors.adjustment_date}</p>}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <Input placeholder="Buscar por SKU o nombre..." value={localFilters.term || ''} onChange={e => setLocalFilters(prev => ({ ...prev, term: e.target.value }))} />
                                <Select value={localFilters.category_id || ''} onValueChange={v => setLocalFilters(prev => ({ ...prev, category_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Categoría..." /></SelectTrigger>
                                    <SelectContent>{filterOptions.categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={localFilters.supplier_id || ''} onValueChange={v => setLocalFilters(prev => ({ ...prev, supplier_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Suplidor..." /></SelectTrigger>
                                    <SelectContent>{filterOptions.suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    </aside>

                    <main className="lg:col-span-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Productos a Ajustar</CardTitle>
                                <CardDescription>Modifica el "Stock Físico" para los productos que lo necesiten. Solo las filas modificadas se guardarán.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[45%]">Producto</TableHead>
                                            <TableHead className="text-right">Stock Actual</TableHead>
                                            <TableHead className="w-[150px] text-right">Stock Físico (Nuevo)</TableHead>
                                            <TableHead className="text-right">Ajuste</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {form.data.items.map((item) => {
                                            const adjustment = toNum(item.new_quantity) - item.previous_quantity;
                                            return (
                                                <TableRow key={item.product_variant_id} className={cn("transition-colors", item.is_dirty && "bg-blue-500/10 border-l-4 border-l-blue-500")}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.product_label}</div>
                                                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{item.previous_quantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Input type="number" step="0.01" value={String(item.new_quantity)} onChange={e => handleItemChange(item.product_variant_id, e.target.value)} className="text-right h-8" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <AdjustmentValue value={adjustment} />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                                <Pagination className="mt-4" links={variants.links} />
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </form>
        </AppLayout>
    );
}