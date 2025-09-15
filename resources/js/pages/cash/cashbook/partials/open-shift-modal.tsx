/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Eraser,
    Plus,
    Minus,
    Calculator,
    Coins,
    Banknote,
    Eye,
    EyeOff,
    RotateCcw
} from "lucide-react";

import CashShiftController from "@/actions/App/Http/Controllers/Cash/CashShiftController";

// Types and helpers
type Denomination = {
    id: number;
    value: number;
    kind: "bill" | "coin";
    currency_code: string;
};

const money = (n: number, c = "DOP") =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2
    }).format(Number(n || 0));

// Quick amount preset buttons
const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

// =================================================================================
// Enhanced Denomination Row Component
// =================================================================================
function DenominationRow({
    denomination: d,
    quantity,
    onQuantityChange,
}: {
    denomination: Denomination;
    quantity: number;
    onQuantityChange: (newQty: number) => void;
}) {
    const [inputValue, setInputValue] = React.useState(quantity.toString());
    const subtotal = quantity * d.value;

    React.useEffect(() => {
        setInputValue(quantity.toString());
    }, [quantity]);

    const handleIncrement = () => onQuantityChange(quantity + 1);
    const handleDecrement = () => onQuantityChange(Math.max(0, quantity - 1));

    const handleInputChange = (value: string) => {
        setInputValue(value);
        const numValue = Math.max(0, Number(value) || 0);
        onQuantityChange(numValue);
    };

    const handleQuickAdd = (amount: number) => {
        onQuantityChange(quantity + amount);
    };

    const isHighValue = d.value >= 1000;
    const hasQuantity = quantity > 0;

    return (
        <Card className={`transition-all duration-200 ${hasQuantity ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
            <CardContent className="p-4">
                {/* Denomination header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {d.kind === "bill" ? (
                            <Banknote className={`h-4 w-4 ${isHighValue ? 'text-green-600' : 'text-blue-600'}`} />
                        ) : (
                            <Coins className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                            <Badge variant={d.kind === "bill" ? "default" : "secondary"} className="text-xs">
                                {d.kind === "bill" ? "Billete" : "Moneda"}
                            </Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`font-bold text-lg ${isHighValue ? 'text-green-600' : ''}`}>
                            {money(d.value, d.currency_code)}
                        </div>
                    </div>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 mb-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleDecrement}
                        disabled={quantity === 0}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="h-8 text-center font-medium [appearance:textfield] focus-visible:ring-offset-0"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={() => setInputValue(quantity.toString())}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleIncrement}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Quick add buttons for high-value denominations */}
                {isHighValue && (
                    <div className="flex gap-1 mb-3">
                        {QUICK_AMOUNTS.slice(0, 3).map(amount => (
                            <Button
                                key={amount}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => handleQuickAdd(amount)}
                            >
                                +{amount}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Subtotal */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                    <span className={`font-semibold tabular-nums ${hasQuantity ? 'text-primary' : 'text-muted-foreground'}`}>
                        {money(subtotal, d.currency_code)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

// =================================================================================
// Currency Summary Component
// =================================================================================
function CurrencySummary({
    currency,
    total,
    isActive,
    onClick
}: {
    currency: string;
    total: number;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <Button
            variant={isActive ? "default" : "outline"}
            className={`h-auto p-3 flex flex-col items-center gap-1 ${isActive ? 'ring-2 ring-primary/20' : ''}`}
            onClick={onClick}
        >
            <div className="text-xs font-medium opacity-80">{currency}</div>
            <div className="font-bold tabular-nums">{money(total, currency)}</div>
        </Button>
    );
}

// =================================================================================
// Main Component
// =================================================================================
export function OpenShiftModal({
    open,
    setOpen,
    registerId,
    denominations,
    activeCurrency = "DOP",
    onSuccess,
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    registerId: number;
    denominations: Denomination[];
    activeCurrency?: string;
    onSuccess: () => void;
}) {
    const [qty, setQty] = React.useState<Record<number, number>>({});
    const [note, setNote] = React.useState("");
    const [hideZeros, setHideZeros] = React.useState(false);
    const [showTotals, setShowTotals] = React.useState(true);

    const { post, processing, reset } = useForm({});

    // Reset state when modal closes
    React.useEffect(() => {
        if (!open) {
            setQty({});
            setNote("");
            setHideZeros(false);
            setShowTotals(true);
            reset();
        }
    }, [open, reset]);

    // Group denominations by currency
    const groups = React.useMemo(() => {
        const by: Record<string, Denomination[]> = {};
        denominations.forEach(d => ((by[d.currency_code] ??= []).push(d)));
        Object.values(by).forEach(list =>
            list.sort((a, b) => {
                // Sort by kind first (bills before coins), then by value (desc)
                if (a.kind !== b.kind) return a.kind === "bill" ? -1 : 1;
                return b.value - a.value;
            })
        );
        return by;
    }, [denominations]);

    const currencies = React.useMemo(() => Object.keys(groups), [groups]);

    const [tab, setTab] = React.useState(
        activeCurrency && currencies.includes(activeCurrency)
            ? activeCurrency
            : (currencies[0] ?? "DOP")
    );

    React.useEffect(() => {
        if (activeCurrency && currencies.includes(activeCurrency)) {
            setTab(activeCurrency);
        }
    }, [activeCurrency, currencies]);

    // Calculate totals
    const totals: Record<string, number> = React.useMemo(() => {
        const t: Record<string, number> = {};
        for (const [ccy, list] of Object.entries(groups)) {
            t[ccy] = list.reduce((sum, d) => sum + (qty[d.id] || 0) * d.value, 0);
        }
        return t;
    }, [groups, qty]);

    const grandTotal = Object.values(totals).reduce((sum, total) => sum + total, 0);
    const hasAnyAmount = Object.values(qty).some(q => q > 0);

    // Actions
    const clearCurrency = (ccy: string) => {
        const list = groups[ccy] ?? [];
        const clearedIds = new Set(list.map(d => d.id));
        setQty(prev => {
            const next = { ...prev };
            for (const id in next) {
                if (clearedIds.has(Number(id))) {
                    delete next[id];
                }
            }
            return next;
        });
    };

    const clearAll = () => {
        setQty({});
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!hasAnyAmount) {
            toast.error("Debe ingresar al menos una cantidad para abrir el turno");
            return;
        }

        const opening: Record<string, { denomination_id: number; qty: number }[]> = {};
        Object.entries(groups).forEach(([ccy, list]) => {
            const lines = list
                .map(d => ({ denomination_id: d.id, qty: Number(qty[d.id] || 0) }))
                .filter(l => l.qty > 0);
            if (lines.length) opening[ccy] = lines;
        });

        post(CashShiftController.open.url({ register: registerId }), {
            data: { register_id: registerId, opening, note: note.trim() },
            onSuccess: () => {
                toast.success("Turno abierto exitosamente");
                onSuccess();
                setOpen(false);
            },
            onError: (errors) => {
                console.error('Errors:', errors);
                toast.error("Error al abrir el turno. Verifique los datos ingresados.");
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="flex h-[95vh] w-[95vw] max-w-6xl flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <Calculator className="h-6 w-6" />
                                Abrir turno de caja
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Registra el conteo inicial de efectivo por moneda y denominación
                            </DialogDescription>
                        </div>
                        {showTotals && (
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total general</div>
                                <div className="text-2xl font-bold text-primary">
                                    {money(grandTotal, activeCurrency)}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* Currency summaries and controls */}
                <div className="px-6 py-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2">
                            {currencies.map(ccy => (
                                <CurrencySummary
                                    key={ccy}
                                    currency={ccy}
                                    total={totals[ccy] || 0}
                                    isActive={tab === ccy}
                                    onClick={() => setTab(ccy)}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <Label htmlFor="hide-zeros" className="flex cursor-pointer items-center gap-2 text-sm">
                                <Switch
                                    id="hide-zeros"
                                    checked={hideZeros}
                                    onCheckedChange={setHideZeros}
                                />
                                {hideZeros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                Ocultar ceros
                            </Label>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => clearCurrency(tab)}
                                disabled={!Object.values(qty).some(q => q > 0)}
                            >
                                <Eraser className="h-4 w-4 mr-2" />
                                Limpiar {tab}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearAll}
                                disabled={!hasAnyAmount}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Limpiar todo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-hidden">
                    <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
                        <div className="flex-1 overflow-hidden">
                            {currencies.map(ccy => {
                                const filteredDenominations = (groups[ccy] ?? [])
                                    .filter(d => hideZeros ? (qty[d.id] || 0) > 0 : true);

                                return (
                                    <TabsContent
                                        key={ccy}
                                        value={ccy}
                                        className="m-0 h-full flex flex-col"
                                    >
                                        <ScrollArea className="flex-1 px-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-4">
                                                {filteredDenominations.map(d => (
                                                    <DenominationRow
                                                        key={d.id}
                                                        denomination={d}
                                                        quantity={qty[d.id] || 0}
                                                        onQuantityChange={newQty =>
                                                            setQty(s => ({ ...s, [d.id]: newQty }))
                                                        }
                                                    />
                                                ))}
                                            </div>

                                            {filteredDenominations.length === 0 && hideZeros && (
                                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                    <EyeOff className="h-12 w-12 mb-4 opacity-50" />
                                                    <p>No hay denominaciones con cantidad mayor a cero</p>
                                                    <p className="text-sm">Desactiva "Ocultar ceros" para ver todas las denominaciones</p>
                                                </div>
                                            )}
                                        </ScrollArea>

                                        {/* Currency total */}
                                        <div className="border-t bg-muted/30 px-6 py-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-medium">
                                                    Total en {ccy}:
                                                </span>
                                                <span className="text-2xl font-bold text-primary tabular-nums">
                                                    {money(totals[ccy] || 0, ccy)}
                                                </span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </div>
                    </Tabs>
                </div>

                {/* Footer */}
                <div className="border-t bg-card p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Notes section */}
                        <div className="space-y-2">
                            <Label htmlFor="shift-note">Nota adicional (opcional)</Label>
                            <Textarea
                                id="shift-note"
                                placeholder="Agregar comentarios sobre el conteo inicial..."
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none"
                            />
                        </div>

                        {/* Summary and actions */}
                        <div className="flex flex-col justify-between">
                            {/* Summary */}
                            <div className="space-y-2 mb-4">
                                <div className="text-sm font-medium text-muted-foreground">Resumen:</div>
                                {currencies.map(ccy => (
                                    <div key={ccy} className="flex justify-between">
                                        <span className="font-medium">{ccy}:</span>
                                        <span className="tabular-nums">{money(totals[ccy] || 0, ccy)}</span>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total:</span>
                                    <span className="text-primary tabular-nums">
                                        {money(grandTotal, activeCurrency)}
                                    </span>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={processing}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={submit}
                                    disabled={processing || !hasAnyAmount}
                                    className="min-w-[140px]"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Calculator className="mr-2 h-4 w-4" />
                                            Abrir turno
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}