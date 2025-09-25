import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import dayjs from 'dayjs';

// --- COMPONENTS & ICONS ---
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Undo2, Loader2 } from "lucide-react";

// --- UTILS, TYPES & ACTIONS ---
import type { Purchase } from "@/types";
import { toNum } from "@/utils/inventory";
import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";

interface Props {
    purchase: Purchase;
}

interface FormData {
    return_date: string;
    notes: string;
    items: {
        purchase_item_id: number;
        quantity: number | string;
    }[];
}

export function ReturnModal({ purchase }: Props) {
    const [open, setOpen] = React.useState(false);

    // Filtramos los items para mostrar solo aquellos que han sido recibidos.
    const returnableItems = purchase?.items.filter(item => toNum(item.qty_received) > 0);


    const form = useForm<FormData>({
        return_date: dayjs().format('YYYY-MM-DD'),
        notes: '',
        items: returnableItems.map(item => ({
            purchase_item_id: item.id,
            quantity: 0, // Por defecto, la cantidad a devolver es 0
        })),
    });

    const handleQuantityChange = (itemId: number, qty: string) => {
        form.setData('items', form.data.items.map(item =>
            item.purchase_item_id === itemId ? { ...item, quantity: qty } : item
        ));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // Filtramos para enviar solo los items que el usuario realmente quiere devolver (cantidad > 0)
        const itemsToSubmit = form.data.items.filter(item => toNum(item.quantity) > 0);

        if (itemsToSubmit.length === 0) {
            toast.error("Debes especificar la cantidad a devolver para al menos un producto.");
            return;
        }

        const payload = { ...form.data, items: itemsToSubmit };

        form.transform(() => payload);
        form.post(PurchaseReturnController.store.url({ purchase: purchase.id }), {
            onSuccess: () => {
                toast.success("Devolución registrada con éxito.");
                setOpen(false);
            },
            onError: (errs) => toast.error("Error al registrar la devolución.", {
                description: Object.values(errs).flat().join(" "),
            }),
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Undo2 className="h-4 w-4" /> Registrar Devolución
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Registrar Devolución sobre Compra</DialogTitle>
                    <DialogDescription>
                        Especifica las cantidades de los productos recibidos que deseas devolver al proveedor.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} id="return-form">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                        <div>
                            <Label htmlFor="return_date">Fecha de Devolución</Label>
                            <Input id="return_date" type="date" value={form.data.return_date} onChange={e => form.setData('return_date', e.target.value)} />
                            {form.errors.return_date && <p className="text-xs text-red-500 mt-1">{form.errors.return_date}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Motivo / Notas</Label>
                            <Textarea id="notes" value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} placeholder="Ej: Productos llegaron dañados..." />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cant. Recibida</TableHead>
                                <TableHead className="w-[150px] text-right">Cant. a Devolver</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnableItems.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product_variant.product.name}</div>
                                        <div className="text-xs text-muted-foreground">SKU: {item.product_variant.sku}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{toNum(item.qty_received)}</TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max={toNum(item.qty_received)}
                                            value={String(form.data.items[index]?.quantity || 0)}
                                            onChange={e => handleQuantityChange(item.id, e.target.value)}
                                            className="h-8 text-right"
                                        />
                                        {form.errors[`items.${index}.quantity`] && <p className="text-xs text-red-500 mt-1">{form.errors[`items.${index}.quantity`]}</p>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </form>
                <DialogFooter>
                    <Button type="submit" form="return-form" disabled={form.processing}>
                        {form.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {form.processing ? "Procesando..." : "Confirmar Devolución"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}