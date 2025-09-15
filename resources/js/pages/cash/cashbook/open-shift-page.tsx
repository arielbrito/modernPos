/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    RotateCcw,
    ArrowLeft,
    Save,
    AlertCircle
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
// Enhanced Denomination Card Component
// =================================================================================
function DenominationCard({
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
        <Card className={`transition-all duration-200 hover:shadow-md ${hasQuantity ? 'ring-2 ring-primary/20 bg-primary/5 shadow-sm' : 'hover:bg-muted/50'}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        {d.kind === "bill" ? (
                            <Banknote className={`h-5 w-5 ${isHighValue ? 'text-green-600' : 'text-blue-600'}`} />
                        ) : (
                            <Coins className="h-5 w-5 text-amber-600" />
                        )}
                        <Badge variant={d.kind === "bill" ? "default" : "secondary"} className="text-xs">
                            {d.kind === "bill" ? "Billete" : "Moneda"}
                        </Badge>
                    </div>
                    <div className={`font-bold text-lg ${isHighValue ? 'text-green-600' : ''}`}>
                        {money(d.value, d.currency_code)}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
                {/* Quantity controls */}
                <div className="flex items-center gap-3 mb-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={handleDecrement}
                        disabled={quantity === 0}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="h-10 text-center text-lg font-medium [appearance:textfield] focus-visible:ring-2"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={() => setInputValue(quantity.toString())}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={handleIncrement}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Quick add buttons for high-value denominations */}
                {isHighValue && (
                    <div className="flex gap-2 mb-4">
                        {QUICK_AMOUNTS.slice(0, 3).map(amount => (
                            <Button
                                key={amount}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-3 flex-1"
                                onClick={() => handleQuickAdd(amount)}
                            >
                                +{amount}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Subtotal */}
                <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Subtotal:</span>
                        <span className={`font-bold text-lg tabular-nums ${hasQuantity ? 'text-primary' : 'text-muted-foreground'}`}>
                            {money(subtotal, d.currency_code)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// =================================================================================
// Currency Tab Button Component
// =================================================================================
function CurrencyTabButton({
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
            size="lg"
            className={`h-auto p-4 flex flex-col items-center gap-2 min-w-[120px] ${isActive ? 'ring-2 ring-primary/30 shadow-md' : 'hover:bg-muted'}`}
            onClick={onClick}
        >
            <div className="text-sm font-medium opacity-90">{currency}</div>
            <div className="font-bold text-lg tabular-nums">{money(total, currency)}</div>
        </Button>
    );
}

// =================================================================================
// Main Page Component
// =================================================================================
export function OpenShiftPage({
    registerId,
    denominations,
    activeCurrency = "DOP",
    onSuccess,
    onCancel,
}: {
    registerId: number;
    denominations: Denomination[];
    activeCurrency?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}) {
    const [qty, setQty] = React.useState<Record<number, number>>({});
    const [note, setNote] = React.useState("");
    const [hideZeros, setHideZeros] = React.useState(false);

    const { post, processing, reset } = useForm({});

    // Group denominations by currency
    const groups = React.useMemo(() => {
        const by: Record<string, Denomination[]> = {};
        denominations.forEach(d => ((by[d.currency_code] ??= []).push(d)));
        Object.values(by).forEach(list =>
            list.sort((a, b) => {
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

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.visit('/cash/registers'); // or wherever you want to navigate
        }
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
        const payload = { register_id: registerId, opening, note: note.trim() };

        router.post(CashShiftController.open.url({ register: registerId }),
            payload,
            {
                onSuccess: () => {
                    toast.success("Turno abierto exitosamente");
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.visit('/cash/registers');
                    }
                },
                onError: (errors) => {
                    console.error('Errors:', errors);
                    toast.error("Error al abrir el turno. Verifique los datos ingresados.");
                },
                preserveScroll: true,


            }

        );
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancel}
                                className="hover:bg-muted"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3">
                                    <Calculator className="h-8 w-8 text-primary" />
                                    Abrir turno de caja
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Registra el conteo inicial de efectivo por moneda y denominación
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total general</div>
                            <div className="text-3xl font-bold text-primary tabular-nums">
                                {money(grandTotal, activeCurrency)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Currency tabs and controls */}
            <div className="border-b bg-muted/30">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex gap-3">
                            {currencies.map(ccy => (
                                <CurrencyTabButton
                                    key={ccy}
                                    currency={ccy}
                                    total={totals[ccy] || 0}
                                    isActive={tab === ccy}
                                    onClick={() => setTab(ccy)}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <Label htmlFor="hide-zeros" className="flex cursor-pointer items-center gap-3 text-sm">
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
                                onClick={() => clearCurrency(tab)}
                                disabled={!Object.values(qty).some(q => q > 0)}
                            >
                                <Eraser className="h-4 w-4 mr-2" />
                                Limpiar {tab}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearAll}
                                disabled={!hasAnyAmount}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Limpiar todo
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-6 py-8">
                <Tabs value={tab} onValueChange={setTab}>
                    {currencies.map(ccy => {
                        const filteredDenominations = (groups[ccy] ?? [])
                            .filter(d => hideZeros ? (qty[d.id] || 0) > 0 : true);

                        return (
                            <TabsContent key={ccy} value={ccy} className="mt-0">
                                {/* Currency total banner */}
                                <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                                                <span className="text-primary font-bold text-lg">{ccy}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold">Total en {ccy}</h3>
                                                <p className="text-muted-foreground">
                                                    {filteredDenominations.length} denominaciones
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-primary tabular-nums">
                                                {money(totals[ccy] || 0, ccy)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Denominations grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
                                    {filteredDenominations.map(d => (
                                        <DenominationCard
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
                                    <Card className="py-12">
                                        <CardContent className="flex flex-col items-center justify-center text-center">
                                            <EyeOff className="h-16 w-16 mb-4 text-muted-foreground/50" />
                                            <h3 className="text-xl font-semibold mb-2">No hay denominaciones visibles</h3>
                                            <p className="text-muted-foreground mb-4">
                                                No hay denominaciones con cantidad mayor a cero en {ccy}
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => setHideZeros(false)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Mostrar todas las denominaciones
                                            </Button>
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
                        {/* Notes section */}
                        <div className="space-y-3">
                            <Label htmlFor="shift-note" className="text-base font-medium">
                                Nota adicional (opcional)
                            </Label>
                            <Textarea
                                id="shift-note"
                                placeholder="Agregar comentarios sobre el conteo inicial..."
                                rows={4}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none text-base"
                            />
                        </div>

                        {/* Summary and actions */}
                        <div className="flex flex-col justify-between">
                            {/* Summary */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="h-5 w-5" />
                                        Resumen del conteo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {currencies.map(ccy => (
                                            <div key={ccy} className="flex justify-between items-center">
                                                <span className="font-medium">{ccy}:</span>
                                                <span className="tabular-nums text-lg font-semibold">
                                                    {money(totals[ccy] || 0, ccy)}
                                                </span>
                                            </div>
                                        ))}
                                        <Separator />
                                        <div className="flex justify-between items-center text-xl font-bold">
                                            <span>Total general:</span>
                                            <span className="text-primary tabular-nums">
                                                {money(grandTotal, activeCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action buttons */}
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={processing || !hasAnyAmount}
                                    className="flex-1 min-w-[200px]"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Abrir turno
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Warning if no amounts */}
                            {!hasAnyAmount && (
                                <div className="flex items-center gap-2 text-amber-600 text-sm mt-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Debe ingresar al menos una cantidad para continuar</span>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}