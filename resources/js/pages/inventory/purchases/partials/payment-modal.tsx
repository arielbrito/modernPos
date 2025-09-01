/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import dayjs from 'dayjs';

// --- COMPONENTS ---
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Wallet, Calendar, FileText, StickyNote } from "lucide-react";

// --- CONSTANTS & UTILS ---
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/payments";
import { money } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// --- TYPES ---
interface Props {
    purchaseId: number;
    maxAmount: number;
}

export function PaymentModal({ purchaseId, maxAmount }: Props) {
    const [open, setOpen] = React.useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        method: "cash" as PaymentMethod,
        paid_amount: maxAmount,
        paid_at: dayjs().format('YYYY-MM-DDTHH:mm'), // Formato correcto para datetime-local
        reference: "",
        notes: "",
    });

    // Reseteamos el formulario cada vez que se abre el modal.
    React.useEffect(() => {
        if (open) {
            reset();
            // Pre-llenamos con el monto máximo y la fecha/hora actual
            setData({
                ...data,
                paid_amount: maxAmount,
                paid_at: dayjs().format('YYYY-MM-DDTHH:mm'),
            });
        }
    }, [open, maxAmount]);


    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(PurchaseController.storePayment.url({ purchase: purchaseId }), {
            onSuccess: () => {
                toast.success("Pago registrado con éxito");
                setOpen(false);
            },
            onError: (err) => {
                // Los errores de campo se mostrarán automáticamente.
                // Mostramos un error genérico solo si no hay errores de campo específicos.
                if (Object.keys(err).length === 0) {
                    toast.error("Error inesperado", { description: "No se pudo registrar el pago. Inténtalo de nuevo." });
                }
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar un nuevo pago</DialogTitle>
                    <DialogDescription>
                        El balance pendiente de esta compra es de{" "}
                        <span className="font-bold text-foreground">{money(maxAmount)}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-5 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="method">Método de pago</Label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Select value={data.method} onValueChange={(v: PaymentMethod) => setData("method", v)} disabled={processing}>
                                    <SelectTrigger id="method" className="pl-10"><SelectValue placeholder="Selecciona método" /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {errors.method && <p className="mt-1 text-xs text-red-500">{errors.method}</p>}
                        </div>
                        <div>
                            <Label htmlFor="amount">Monto a pagar</Label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                    id="amount" type="number" step="0.01"
                                    value={data.paid_amount}
                                    onChange={(e) => setData("paid_amount", Number(e.target.value))}
                                    className={`pl-10 ${errors.paid_amount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    disabled={processing}
                                />
                            </div>
                            {errors.paid_amount && <p className="mt-1 text-xs text-red-500">{errors.paid_amount}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="paid_at">Fecha y hora del pago</Label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="paid_at" type="datetime-local"
                                value={data.paid_at}
                                onChange={(e) => setData("paid_at", e.target.value)}
                                className="pl-10"
                                disabled={processing}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="reference">Referencia (Opcional)</Label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="reference"
                                value={data.reference}
                                onChange={(e) => setData("reference", e.target.value)}
                                className="pl-10"
                                placeholder="Ej: #CHEQUE-123"
                                disabled={processing}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes">Notas (Opcional)</Label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-3 top-0">
                                <StickyNote className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Textarea
                                id="notes" rows={3}
                                value={data.notes}
                                onChange={(e) => setData("notes", e.target.value)}
                                className="pl-10"
                                placeholder="Abono a factura F-BC-00123..."
                                disabled={processing}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-2">
                        <Button type="button" variant="ghost" onClick={() => setData('paid_amount', maxAmount)} disabled={processing}>
                            Pagar Saldo Completo
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : "Guardar Pago"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
