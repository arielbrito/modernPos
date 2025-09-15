/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calculator, Coins, Banknote, Eye, EyeOff, ArrowLeft, Save, Loader2 } from "lucide-react";

import CashShiftController from "@/actions/App/Http/Controllers/Cash/CashShiftController";

type Denomination = { id: number; value: number; kind: "bill" | "coin"; currency_code: string };

const money = (n: number, c = "DOP") =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: c, maximumFractionDigits: 2 })
        .format(Number(n || 0));

function DenominationCard({
    denomination: d,
    quantity,
    onQuantityChange,
}: {
    denomination: Denomination;
    quantity: number;
    onQuantityChange: (q: number) => void;
}) {
    const subtotal = (quantity || 0) * d.value;
    return (
        <Card className={`transition-all ${quantity > 0 ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        {d.kind === "bill" ? <Banknote className="h-5 w-5 text-blue-600" /> : <Coins className="h-5 w-5 text-amber-600" />}
                        <Badge variant={d.kind === "bill" ? "default" : "secondary"} className="text-xs">
                            {d.kind === "bill" ? "Billete" : "Moneda"}
                        </Badge>
                    </div>
                    <div className="font-bold">{money(d.value, d.currency_code)}</div>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-2">
                    <Label className="text-xs">Cant.</Label>
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={String(quantity || 0)}
                        onChange={(e) => onQuantityChange(Math.max(0, Number(e.target.value) || 0))}
                        className="h-9 w-24 text-right"
                    />
                    <div className="ml-auto text-sm tabular-nums">{money(subtotal, d.currency_code)}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function CurrencyButton({
    ccy, total, expected, active, onClick,
}: {
    ccy: string; total: number; expected: number; active: boolean; onClick: () => void;
}) {
    const diff = (total || 0) - (expected || 0);
    const color = diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-rose-600";
    return (
        <Button
            variant={active ? "default" : "outline"}
            className="h-auto px-4 py-3 flex flex-col items-center gap-1 min-w-[120px]"
            onClick={onClick}
        >
            <div className="text-sm font-medium">{ccy}</div>
            <div className="text-xs text-muted-foreground">Estimado: {money(expected, ccy)}</div>
            <div className="font-semibold tabular-nums">{money(total, ccy)}</div>
            <div className={`text-xs ${color}`}>
                {diff === 0 ? "OK" : diff > 0 ? `+${money(diff, ccy)}` : `${money(diff, ccy)}`}
            </div>
        </Button>
    );
}

export function CloseShiftPage({
    shiftId,
    registerId,
    denominations,
    expected,
    activeCurrency = "DOP",
    onSuccess,
    onCancel,
}: {
    shiftId: string | number;
    registerId: number;
    denominations: Denomination[];
    expected: Record<string, number>;
    activeCurrency?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}) {
    const [qty, setQty] = React.useState<Record<number, number>>({});
    const [note, setNote] = React.useState("");
    const [hideZeros, setHideZeros] = React.useState(false);

    const { processing } = useForm({});

    // Group by currency
    const groups = React.useMemo(() => {
        const by: Record<string, Denomination[]> = {};
        denominations.forEach(d => ((by[d.currency_code] ??= []).push(d)));
        Object.values(by).forEach(list => {
            list.sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === "bill" ? -1 : 1;
                return b.value - a.value;
            });
        });
        return by;
    }, [denominations]);

    const currencies = React.useMemo(() => Object.keys(groups), [groups]);
    const [tab, setTab] = React.useState(
        activeCurrency && currencies.includes(activeCurrency) ? activeCurrency : (currencies[0] ?? "DOP")
    );

    // Counted totals
    const totals: Record<string, number> = React.useMemo(() => {
        const t: Record<string, number> = {};
        for (const [ccy, list] of Object.entries(groups)) {
            t[ccy] = list.reduce((s, d) => s + (qty[d.id] || 0) * d.value, 0);
        }
        return t;
    }, [groups, qty]);

    const grandExpected = Object.entries(expected).reduce((s, [, v]) => s + Number(v || 0), 0);
    const grandCounted = Object.values(totals).reduce((s, v) => s + Number(v || 0), 0);
    const grandDiff = grandCounted - grandExpected;

    const clearCurrency = (ccy: string) => {
        const ids = new Set((groups[ccy] ?? []).map(d => d.id));
        setQty(prev => {
            const next = { ...prev };
            for (const id in next) if (ids.has(Number(id))) delete next[id as any];
            return next;
        });
    };

    const handleCancel = () => {
        if (onCancel) onCancel(); else router.visit(`/cash/registers/${registerId}/cashbook`);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const closing: Record<string, { denomination_id: number; qty: number }[]> = {};
        Object.entries(groups).forEach(([ccy, list]) => {
            const lines = list
                .map(d => ({ denomination_id: d.id, qty: Number(qty[d.id] || 0) }))
                .filter(l => l.qty >= 0); // permite 0 (por si no hay)
            if (lines.length) closing[ccy] = lines;
        });
        const payload = {
            note: note.trim(),
            closing,
            shift: shiftId
        }

        router.post(CashShiftController.close.url({ shift: Number(shiftId) }),
            payload,
            {
                onSuccess: () => { toast.success("Turno cerrado"); onSuccess ? onSuccess() : null; },
                onError: () => toast.error("No se pudo cerrar el turno."),
                preserveScroll: true,
            }

        );
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={handleCancel}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3">
                                    <Calculator className="h-8 w-8 text-primary" />
                                    Cerrar turno de caja
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Compara <b>estimado</b> vs <b>contado</b> por moneda y denominación.
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Diferencia total</div>
                            <div className={`text-3xl font-bold tabular-nums ${grandDiff === 0 ? "" : grandDiff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {money(grandDiff, activeCurrency)}
                            </div>
                        </div>
                    </div>

                    {/* Currencies buttons */}
                    <div className="mt-6 flex flex-wrap gap-3">
                        {currencies.map(ccy => (
                            <CurrencyButton
                                key={ccy}
                                ccy={ccy}
                                total={totals[ccy] || 0}
                                expected={expected[ccy] || 0}
                                active={tab === ccy}
                                onClick={() => setTab(ccy)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="border-b bg-muted/30">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4 justify-between">
                    <Label htmlFor="hide-zeros" className="flex items-center gap-3 text-sm cursor-pointer">
                        <Switch id="hide-zeros" checked={hideZeros} onCheckedChange={setHideZeros} />
                        {hideZeros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        Ocultar ceros
                    </Label>

                    <Button variant="outline" onClick={() => clearCurrency(tab)}>
                        Limpiar {tab}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-8">
                <Tabs value={tab} onValueChange={setTab}>
                    {currencies.map(ccy => {
                        const list = (groups[ccy] ?? []).filter(d => hideZeros ? (qty[d.id] || 0) > 0 : true);
                        const diff = (totals[ccy] || 0) - (expected[ccy] || 0);
                        return (
                            <TabsContent key={ccy} value={ccy} className="mt-0">
                                <Card className="mb-6">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">{ccy}</div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Estimado</div>
                                                <div className="text-xl font-semibold tabular-nums">{money(expected[ccy] || 0, ccy)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">Contado</div>
                                            <div className="text-xl font-semibold tabular-nums">{money(totals[ccy] || 0, ccy)}</div>
                                            <div className={`text-sm ${diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                {diff === 0 ? "OK" : diff > 0 ? `Sobrante ${money(diff, ccy)}` : `Faltante ${money(diff, ccy)}`}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {list.map(d => (
                                        <DenominationCard
                                            key={d.id}
                                            denomination={d}
                                            quantity={qty[d.id] || 0}
                                            onQuantityChange={(q) => setQty(s => ({ ...s, [d.id]: q }))}
                                        />
                                    ))}
                                </div>

                                {list.length === 0 && hideZeros && (
                                    <Card className="py-12 mt-4">
                                        <CardContent className="text-center text-muted-foreground">
                                            No hay denominaciones visibles en {ccy}.
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>

            {/* Footer */}
            <div className="border-t bg-white/80 backdrop-blur-sm sticky bottom-0">
                <div className="container mx-auto px-6 py-6">
                    <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label>Nota de cierre (opcional)</Label>
                            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>

                        <div className="flex flex-col justify-between">
                            <Card className="mb-6">
                                <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    {Object.keys(expected).map(ccy => (
                                        <div key={ccy} className="flex items-center justify-between">
                                            <span className="font-medium">{ccy}</span>
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Estimado</div>
                                                <div className="tabular-nums">{money(expected[ccy] || 0, ccy)}</div>
                                                <div className="text-xs text-muted-foreground mt-1">Contado</div>
                                                <div className="tabular-nums">{money(totals[ccy] || 0, ccy)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <Separator className="my-2" />
                                    <div className="flex items-center justify-between text-lg font-semibold">
                                        <span>Diferencia total</span>
                                        <span className={`tabular-nums ${grandDiff === 0 ? "" : grandDiff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {money(grandDiff, activeCurrency)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-4">
                                <Button type="button" variant="outline" onClick={onCancel} disabled={processing} className="flex-1">
                                    <ArrowLeft className="h-4 w-4 mr-2" /> Cancelar
                                </Button>
                                <Button type="submit" disabled={processing} className="flex-1 min-w-[200px]">
                                    {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cerrando…</> : <><Save className="h-4 w-4 mr-2" /> Cerrar turno</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
