
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { router, useForm } from "@inertiajs/react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

import CashMovementController from "@/actions/App/Http/Controllers/Cash/CashMovementController";

const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

export function CashMovementModal({
    open, setOpen, shiftId, currency, direction, onSuccess
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    shiftId: string;
    currency: string;
    direction: "in" | "out";
    onSuccess: () => void;
}) {
    const { data, setData, processing, reset } = useForm({
        amount: 0,
        reason: "",
        reference: "",
        notes: "",
    });

    React.useEffect(() => { if (!open) reset(); }, [open]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(data.amount) <= 0) { toast.error("Indica un monto válido."); return; }

        const payload = {
            shift_id: shiftId,
            direction,
            currency_code: currency,
            amount: Number(data.amount),
            reason: data.reason || null,
            reference: data.reference || null,
            notes: data.notes || null
        };

        router.post(CashMovementController.store.url(),
            payload,

            {
                onSuccess: () => { onSuccess(); setOpen(false); },
                onError: () => toast.error("No se pudo registrar el movimiento."),
            }

        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{direction === "in" ? "Ingreso de efectivo" : "Salida de efectivo"}</DialogTitle>
                    <DialogDescription>Registra un movimiento manual de caja.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div>
                        <Label>Monto</Label>
                        <Input type="number" step="0.01" value={String(data.amount)} onChange={(e) => setData("amount", Number(e.target.value))} />
                        <div className="mt-1 text-xs text-muted-foreground">{money(Number(data.amount), currency)}</div>
                    </div>
                    <div>
                        <Label>Motivo</Label>
                        <Input value={data.reason} onChange={(e) => setData("reason", e.target.value)} placeholder="drop, payout, ajuste…" />
                    </div>
                    <div>
                        <Label>Referencia (opcional)</Label>
                        <Input value={data.reference} onChange={(e) => setData("reference", e.target.value)} placeholder="#doc, proveedor, etc." />
                    </div>
                    <div>
                        <Label>Notas</Label>
                        <Textarea rows={3} value={data.notes} onChange={(e) => setData("notes", e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : "Guardar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
