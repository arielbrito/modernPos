/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import InputError from '@/components/input-error';

import CashMovementController from '@/actions/App/Http/Controllers/Cash/CashMovementController';

const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-do", { style: "currency", currency: c }).format(Number(n || 0));

export function CashMovementModal({
    open, setOpen, shiftId, currency, direction, onSuccess
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    shiftId: string | number;
    currency: string;
    direction: "in" | "out";
    onSuccess: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        shift_id: shiftId,
        direction: direction,
        currency_code: currency,
        amount: '',
        reason: '',
        reference: '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            setData({
                ...data,
                shift_id: shiftId,
                direction: direction,
                currency_code: currency,
            });
        } else {
            reset('amount', 'reason', 'reference', 'notes');
        }
    }, [open, shiftId, currency, direction]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(CashMovementController.store.url(), {
            onSuccess: () => {
                onSuccess();
                setOpen(false);
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors)[0];
                toast.error("Error al registrar", { description: firstError });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{direction === "in" ? "Ingreso de Efectivo" : "Salida de Efectivo"}</DialogTitle>
                    <DialogDescription>Registra un movimiento manual de caja para el turno actual.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4 pt-4">
                    <div>
                        <Label htmlFor="amount">Monto ({data.currency_code})</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={data.amount}
                            onChange={(e) => setData("amount", e.target.value)}
                            autoFocus
                            className={errors.amount ? 'border-destructive' : ''}
                        />
                        <div className="mt-1 text-xs text-muted-foreground">
                            {money(Number(data.amount) || 0, data.currency_code)}
                        </div>
                        <InputError message={errors.amount} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="reason">Motivo</Label>
                        <Input
                            id="reason"
                            value={data.reason}
                            onChange={(e) => setData("reason", e.target.value)}
                            placeholder="Ej: Compra de agua, Adelanto, etc."
                            className={errors.reason ? 'border-destructive' : ''}
                        />
                        <InputError message={errors.reason} className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="reference">Referencia (Opcional)</Label>
                        <Input id="reference" value={data.reference} onChange={(e) => setData("reference", e.target.value)} placeholder="# de factura, Cédula, etc." />
                    </div>
                    <div>
                        <Label htmlFor="notes">Notas (Opcional)</Label>
                        <Textarea id="notes" rows={2} value={data.notes} onChange={(e) => setData("notes", e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Movimiento
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}