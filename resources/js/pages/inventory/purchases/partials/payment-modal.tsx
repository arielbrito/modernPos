import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Calendar, FileText, StickyNote } from "lucide-react";

import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/payments";
import { money } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchaseId: number;
    maxAmount: number;
}

export function PaymentModal({ purchaseId, maxAmount }: Props) {
    const [open, setOpen] = React.useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        method: "cash" as PaymentMethod,
        paid_amount: maxAmount,
        paid_at: dayjs().format("YYYY-MM-DDTHH:mm"),
        reference: "",
        notes: "",
    });

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            reset();
            setData("paid_amount", maxAmount);
        }
        setOpen(isOpen);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(PurchaseController.storePayment.url({ purchase: purchaseId }), {
            onSuccess: () => {
                toast.success("Pago registrado con éxito");
                setOpen(false);
            },
            onError: (errs) => {
                toast.error("Error al registrar el pago", {
                    description: Object.values(errs).flat().join(" "),
                });
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="pos-button-primary gap-2">
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg pos-card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle>Registrar un nuevo pago</DialogTitle>
                </div>

                <DialogDescription className="px-4">
                    Balance pendiente:{" "}
                    <span className="font-bold text-foreground">{money(maxAmount)}</span>
                </DialogDescription>

                <form onSubmit={submit} id="payment-form" className="grid gap-5 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="method">Método de pago</Label>
                            <Select value={data.method} onValueChange={(v: PaymentMethod) => setData("method", v)} disabled={processing}>
                                <SelectTrigger id="method" className="pos-input">
                                    <div className="flex items-center gap-2">
                                        {PAYMENT_METHODS.find((m) => m.value === data.method)?.icon}
                                        <SelectValue placeholder="Selecciona método" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            <div className="flex items-center gap-2">{m.icon}<span>{m.label}</span></div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.method && <p className="mt-1 text-xs text-destructive">{errors.method}</p>}
                        </div>

                        <div>
                            <Label htmlFor="amount">Monto a pagar</Label>
                            <div className="relative mt-1 pos-focus rounded-lg">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={data.paid_amount}
                                    onChange={(e) => setData("paid_amount", Number(e.target.value))}
                                    className={`pl-10 pos-input ${errors.paid_amount ? "border-destructive" : ""}`}
                                    disabled={processing}
                                />
                            </div>
                            {errors.paid_amount && <p className="mt-1 text-xs text-destructive">{errors.paid_amount}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="paid_at">Fecha y hora del pago</Label>
                        <div className="relative mt-1 pos-focus rounded-lg">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="paid_at"
                                type="datetime-local"
                                value={data.paid_at}
                                onChange={(e) => setData("paid_at", e.target.value)}
                                className="pl-10 pos-input"
                                disabled={processing}
                            />
                        </div>
                        {errors.paid_at && <p className="mt-1 text-xs text-destructive">{errors.paid_at}</p>}
                    </div>

                    <div>
                        <Label htmlFor="reference">Referencia (Opcional)</Label>
                        <div className="relative mt-1 pos-focus rounded-lg">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="reference"
                                value={data.reference}
                                onChange={(e) => setData("reference", e.target.value)}
                                className="pl-10 pos-input"
                                placeholder="Ej: #CHEQUE-123"
                                disabled={processing}
                            />
                        </div>
                        {errors.reference && <p className="mt-1 text-xs text-destructive">{errors.reference}</p>}
                    </div>

                    <div>
                        <Label htmlFor="notes">Notas (Opcional)</Label>
                        <div className="relative mt-1 pos-focus rounded-lg">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-start pl-3 pt-3 top-0">
                                <StickyNote className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Textarea
                                id="notes"
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData("notes", e.target.value)}
                                className="pl-10 pos-input"
                                placeholder="Abono a factura F-BC-00123..."
                                disabled={processing}
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 p-4 border-t">
                    <Button type="button" variant="ghost" onClick={() => setData("paid_amount", maxAmount)} disabled={processing} className="pos-hover">
                        Pagar Saldo Completo
                    </Button>
                    <Button type="submit" form="payment-form" disabled={processing} className="pos-button-primary">
                        {processing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>) : "Guardar Pago"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
