import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { toast } from "sonner";
import { router } from "@inertiajs/react";
import { AlertCircle, Check, PackagePlus } from "lucide-react";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// Tipos para mayor claridad
type Item = { id: number; name: string; pending: number };
type Quantities = Record<number, number | string>; // Permite string para manejar el input vacío

export function ReceiveModal({ purchaseId, items }: { purchaseId: number; items: Item[] }) {
    const [open, setOpen] = React.useState(false);
    const [qtys, setQtys] = React.useState<Quantities>({});
    const [processing, setProcessing] = React.useState(false);

    // Reinicia el estado cuando el modal se abre o cierra
    React.useEffect(() => {
        if (!open) {
            setQtys({});
        }
    }, [open]);

    // Función optimizada para manejar cambios en los inputs
    const handleQtyChange = React.useCallback((itemId: number, value: string) => {
        setQtys(prevQtys => ({ ...prevQtys, [itemId]: value }));
    }, []);

    // Función para llenar todos los campos con la cantidad pendiente
    const receiveAll = () => {
        const allQtys = items.reduce((acc, item) => {
            acc[item.id] = item.pending;
            return acc;
        }, {} as Quantities);
        setQtys(allQtys);
    };

    const submit = () => {
        setProcessing(true);
        const payload: Record<number, number> = {};
        let hasError = false;

        items.forEach((it) => {
            const qtyStr = qtys[it.id] ?? '0';
            const quantity = Number(qtyStr);

            if (isNaN(quantity) || quantity < 0) {
                toast.error(`Cantidad inválida para ${it.name}`);
                hasError = true;
                return;
            }
            if (quantity > it.pending) {
                toast.error(`La cantidad para ${it.name} no puede ser mayor a la pendiente.`);
                hasError = true;
                return;
            }
            if (quantity > 0) {
                payload[it.id] = quantity;
            }
        });

        if (hasError) {
            setProcessing(false);
            return;
        }

        if (Object.keys(payload).length === 0) {
            toast.error("Indica al menos una cantidad a recibir");
            setProcessing(false);
            return;
        }

        router.post(PurchaseController.receive.url({ purchase: purchaseId }), { items: payload }, {
            onSuccess: () => {
                toast.success("Recepción registrada correctamente");
                setOpen(false);
            },
            onError: (errors) => {
                const errorMsg = Object.values(errors)[0] || "Error desconocido al registrar la recepción.";
                toast.error(errorMsg);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const nothingToReceive = items.every(it => Number(qtys[it.id] ?? 0) <= 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Check className="h-4 w-4" />
                    Recibir
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Recepción de Productos</DialogTitle>
                    <DialogDescription>
                        Ingresa las cantidades recibidas para cada producto. Los productos recibidos actualizarán el inventario.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="w-28 text-center">Pendiente</TableHead>
                                <TableHead className="w-32 text-center">Recibido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it) => {
                                const currentValue = Number(qtys[it.id] ?? 0);
                                const isInvalid = currentValue > it.pending;
                                return (
                                    <TableRow key={it.id}>
                                        <TableCell className="font-medium">{it.name}</TableCell>
                                        <TableCell className="text-center">{it.pending}</TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={it.pending}
                                                    className={`w-full text-right pr-8 ${isInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                                    value={qtys[it.id] ?? ""}
                                                    onChange={(e) => handleQtyChange(it.id, e.target.value)}
                                                    placeholder="0"
                                                    disabled={processing}
                                                />
                                                {isInvalid && (
                                                    <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                    <Button variant="ghost" onClick={receiveAll} disabled={processing} className="gap-2">
                        <PackagePlus className="h-4 w-4" />
                        Recibir Todo lo Pendiente
                    </Button>
                    <Button onClick={submit} disabled={processing || nothingToReceive}>
                        {processing ? (<>...</>) : "Confirmar Recepción"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
