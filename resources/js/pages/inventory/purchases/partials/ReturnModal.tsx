import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import dayjs from "dayjs";

// --- COMPONENTS & ICONS ---
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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

    // Solo ítems que tienen algo recibido
    const returnableItems = React.useMemo(
        () => purchase.items.filter((it) => toNum(it.qty_received) > 0),
        [purchase.items]
    );

    const form = useForm<FormData>({
        return_date: dayjs().format("YYYY-MM-DD"),
        notes: "",
        items: returnableItems.map((it) => ({
            purchase_item_id: it.id,
            quantity: "", // vacío para UX: el usuario escribe lo que va a devolver
        })),
    });

    // Sincroniza el array base de items si cambia la compra (evita desfase al abrir/cerrar)
    React.useEffect(() => {
        if (!open) return;
        form.setData("items", returnableItems.map((it) => ({
            purchase_item_id: it.id,
            quantity: "",
        })));
    }, [open, returnableItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleQuantityChange = (itemId: number, qty: string) => {
        form.setData(
            "items",
            form.data.items.map((row) =>
                row.purchase_item_id === itemId ? { ...row, quantity: qty } : row
            )
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // Creamos un map para obtener rápidamente el product_variant_id a partir del purchase_item_id
        const byItemId = new Map(
            returnableItems.map((it) => [
                it.id,
                {
                    maxReceived: toNum(it.qty_received),
                    product_variant_id:
                        // Según tu model, puede venir como `product_variant_id` o dentro de `product_variant.id`
                        (it as any).product_variant_id ?? (it as any).product_variant?.id,
                },
            ])
        );

        // Filtramos y transformamos items válidos
        const itemsToSubmit = form.data.items
            .map((row) => {
                const meta = byItemId.get(row.purchase_item_id);
                const qty = toNum(row.quantity);
                if (!meta || qty <= 0) return null;

                // Cap a lo recibido (defensa extra en frontend)
                const quantity = Math.min(qty, meta.maxReceived || 0);
                const product_variant_id = meta.product_variant_id;

                // 🔧 FIX: incluir product_variant_id
                return {
                    purchase_item_id: row.purchase_item_id,
                    product_variant_id, // <= requerido por el backend
                    quantity,
                };
            })
            .filter(Boolean) as { purchase_item_id: number; product_variant_id: number; quantity: number }[];

        if (itemsToSubmit.length === 0) {
            toast.error("Debes especificar la cantidad a devolver para al menos un producto.");
            return;
        }

        form.transform(() => ({
            purchase_id: purchase.id, // enviamos purchase_id en el body
            return_date: form.data.return_date,
            notes: form.data.notes,
            items: itemsToSubmit,
        }));

        // Wayfinder: esta ruta no recibe params en url()
        form.post(PurchaseReturnController.store.url(), {
            onSuccess: () => {
                toast.success("Devolución registrada con éxito.");
                setOpen(false);
            },
            onError: (errs) => {
                const msg = (Object.values(errs) as string[]).flat().join(" ") || "Error al registrar la devolución.";
                toast.error(msg);
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pos-button-secondary ">
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
                            <Input
                                id="return_date"
                                type="date"
                                value={form.data.return_date}
                                onChange={(e) => form.setData("return_date", e.target.value)}
                            />
                            {form.errors.return_date && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.return_date}</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Motivo / Notas</Label>
                            <Textarea
                                id="notes"
                                value={form.data.notes}
                                onChange={(e) => form.setData("notes", e.target.value)}
                                placeholder="Ej: Productos llegaron dañados..."
                            />
                        </div>
                    </div>

                    <Table className="overflow-x-auto scrollbar-stoneretail rounded-lg border">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cant. Recibida</TableHead>
                                <TableHead className="w-[170px] text-right">Cant. a Devolver</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnableItems.map((item, index) => {
                                const received = toNum(item.qty_received);
                                const val = String(form.data.items[index]?.quantity ?? "");
                                const invalid = toNum(val) > received;

                                return (
                                    <TableRow key={item.id} className={invalid ? "bg-red-50" : ""}>
                                        <TableCell>
                                            <div className="font-medium">{item.product_variant.product.name}</div>
                                            <div className="text-xs text-muted-foreground">SKU: {item.product_variant.sku}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{received}</TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={received}
                                                value={val}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                className={`h-8 text-right ${invalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                                placeholder="0"
                                            />
                                            {form.errors[`items.${index}.quantity`] && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {form.errors[`items.${index}.quantity`]}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
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
