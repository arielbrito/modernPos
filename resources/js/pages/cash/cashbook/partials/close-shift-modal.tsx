
import * as React from "react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

import CashShiftController from "@/actions/App/Http/Controllers/Cash/CashShiftController";

type Denomination = { id: number; value: number; kind: "bill" | "coin"; currency_code: string };
const money = (n: number, c = "DOP") =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

export function CloseShiftModal({
    open, setOpen, shiftId, denominations, expectedByCurrency, onSuccess
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    shiftId: string;
    denominations: Denomination[];
    expectedByCurrency: Record<string, number>; // <- { DOP: 7375, USD: 100, ... }
    onSuccess: () => void;
}) {
    const [qty, setQty] = React.useState<Record<number, number>>({});
    const [note, setNote] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    const groups = React.useMemo(() => {
        const by: Record<string, Denomination[]> = {};
        for (const d of denominations) (by[d.currency_code] ??= []).push(d);
        for (const list of Object.values(by)) list.sort((a, b) => b.value - a.value);
        return by;
    }, [denominations]);

    const counted = React.useMemo(() => {
        const t: Record<string, number> = {};
        for (const [ccy, list] of Object.entries(groups)) {
            t[ccy] = list.reduce((s, d) => s + (qty[d.id] || 0) * d.value, 0);
        }
        return t;
    }, [groups, qty]);

    const diff = React.useMemo(() => {
        const d: Record<string, number> = {};
        for (const ccy of Object.keys(groups)) {
            d[ccy] = (counted[ccy] || 0) - (expectedByCurrency[ccy] || 0);
        }
        return d;
    }, [counted, expectedByCurrency, groups]);

    React.useEffect(() => { if (!open) { setQty({}); setNote(""); } }, [open]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const closing: Record<string, { denomination_id: number; qty: number }[]> = {};
        for (const [ccy, list] of Object.entries(groups)) {
            const lines = list
                .map(d => ({ denomination_id: d.id, qty: Number(qty[d.id] || 0) }))
                .filter(l => l.qty > 0);
            if (lines.length) closing[ccy] = lines;
        }

        if (Object.keys(closing).length === 0) {
            toast.error("Indica al menos una cantidad en alguna moneda.");
            return;
        }

        router.post(
            CashShiftController.close.url({ shift: Number(shiftId) }),
            { closing, note }, // <- multi-moneda
            {
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
                onSuccess: () => { onSuccess(); setOpen(false); },
                onError: () => toast.error("No se pudo cerrar el turno."),
                preserveScroll: true,
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Cerrar turno</DialogTitle>
                    <DialogDescription>Cuenta el efectivo por cada moneda. Calculamos la diferencia por moneda.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-5">
                    {Object.keys(groups).sort().map((ccy) => (
                        <div key={ccy} className="rounded-lg border p-3">
                            <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div><span className="text-muted-foreground">Estimado:</span> <span className="font-semibold">{money(expectedByCurrency[ccy] || 0, ccy)}</span></div>
                                <div><span className="text-muted-foreground">Contado:</span> <span className="font-semibold">{money(counted[ccy] || 0, ccy)}</span></div>
                                <div>
                                    <span className="text-muted-foreground">Diferencia:</span>{" "}
                                    <span className={`font-semibold ${diff[ccy] === 0 ? "" : diff[ccy] > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                        {money(diff[ccy] || 0, ccy)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {groups[ccy].map(d => (
                                    <div key={d.id} className="rounded-md border p-3">
                                        <div className="text-xs text-muted-foreground">{d.kind === "bill" ? "Billete" : "Moneda"}</div>
                                        <div className="text-sm font-medium">{money(d.value, ccy)}</div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Label className="text-xs">Cant.</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="1"
                                                inputMode="numeric"
                                                value={qty[d.id] ?? 0}
                                                onChange={(e) => setQty(s => ({ ...s, [d.id]: Number(e.target.value) }))}
                                                className="h-8 w-24 text-right"
                                            />
                                            <div className="ml-auto text-right text-sm tabular-nums">
                                                {money((qty[d.id] || 0) * d.value, ccy)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div>
                        <Label>Nota de cierre (opcional)</Label>
                        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cerrando…</> : "Cerrar turno"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
