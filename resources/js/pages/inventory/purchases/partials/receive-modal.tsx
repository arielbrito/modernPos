import * as React from "react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
    TableHead,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    AlertCircle,
    Check,
    PackagePlus,
    Loader2,
    RotateCcw,
    ClipboardPaste,
    Info,
} from "lucide-react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Item = { id: number; name: string; pending: number };
type Quantities = Record<number, number | string>;

export function ReceiveModal({
    purchaseId,
    items,
}: {
    purchaseId: number;
    items: Item[];
}) {
    const [open, setOpen] = React.useState(false);
    const [qtys, setQtys] = React.useState<Quantities>({});
    const [processing, setProcessing] = React.useState(false);
    const [receiveAllToggle, setReceiveAllToggle] = React.useState(false);

    // refs para navegación con teclado y pegado masivo
    const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

    const hasRows = items.length > 0;

    React.useEffect(() => {
        if (open) {
            // focus al primer input al abrir
            setTimeout(() => inputsRef.current[0]?.focus(), 60);
        } else {
            // reset al cerrar
            setQtys({});
            setReceiveAllToggle(false);
        }
    }, [open]);

    // calcula totales en vivo
    const totals = React.useMemo(() => {
        const pendingTotal = items.reduce((a, it) => a + Number(it.pending || 0), 0);
        const toReceive = items.reduce((a, it, idx) => {
            const raw = qtys[it.id];
            const n = Number(raw ?? 0);
            if (Number.isNaN(n)) return a;
            return a + Math.min(n, it.pending);
        }, 0);
        return { pendingTotal, toReceive };
    }, [items, qtys]);

    // helpers
    const clamp = (val: number, max: number) =>
        Number.isNaN(val) || val < 0 ? 0 : val > max ? max : val;

    const setQty = (itemId: number, value: string) =>
        setQtys((prev) => ({ ...prev, [itemId]: value }));

    const fillAll = (valueProvider: (it: Item) => number | string) => {
        const next: Quantities = {};
        for (const it of items) next[it.id] = valueProvider(it);
        setQtys(next);
    };

    const handleReceiveAllToggle = (checked: boolean) => {
        setReceiveAllToggle(checked);
        if (checked) {
            fillAll((it) => it.pending);
            setTimeout(() => {
                const last = inputsRef.current[items.length - 1];
                last?.focus();
                last?.select?.();
            }, 0);
        } else {
            setQtys({});
            setTimeout(() => inputsRef.current[0]?.focus(), 0);
        }
    };

    const clearAll = () => {
        setQtys({});
        setReceiveAllToggle(false);
        inputsRef.current[0]?.focus();
    };

    // pegado desde Excel/Sheets: reparte números por filas consecutivas
    const handlePaste = (startIndex: number, e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        if (!text) return;
        e.preventDefault();

        const tokens = text
            .trim()
            .split(/\s+|\t|,|\r?\n/)
            .map((t) => t.replace(",", "."))
            .map((t) => Number(t))
            .filter((n) => !Number.isNaN(n));

        if (tokens.length === 0) return;

        setQtys((prev) => {
            const next = { ...prev };
            let row = startIndex;
            for (const n of tokens) {
                if (!items[row]) break;
                next[items[row].id] = n;
                row++;
            }
            return next;
        });

        // mueve el foco a la última fila pegada
        const endIndex = Math.min(startIndex + tokens.length - 1, items.length - 1);
        setTimeout(() => {
            inputsRef.current[endIndex]?.focus();
            inputsRef.current[endIndex]?.select?.();
        }, 0);
    };

    // navegación con Enter y Escape
    const onKeyDown =
        (idx: number, it: Item) => (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const next = inputsRef.current[idx + 1];
                if (next) {
                    next.focus();
                    next.select?.();
                } else {
                    submit(); // última fila -> enviar
                }
            }
            if (e.key === "Escape") setOpen(false);
        };

    const submit = () => {
        if (!hasRows) {
            toast.info("No hay productos pendientes de recibir.");
            return;
        }

        setProcessing(true);
        const payload: Record<number, number> = {};
        let hasError = false;

        for (const it of items) {
            const raw = qtys[it.id];
            if (raw === undefined || raw === "") continue;

            const num = clamp(Number(raw), it.pending);
            if (Number.isNaN(num)) {
                toast.error(`Cantidad inválida para "${it.name}".`);
                hasError = true;
                continue;
            }
            if (num > 0) payload[it.id] = num;
        }

        if (hasError) {
            setProcessing(false);
            return;
        }

        if (Object.keys(payload).length === 0) {
            toast.error("Indica al menos una cantidad a recibir.");
            setProcessing(false);
            return;
        }

        router.post(
            PurchaseController.receive.url({ purchase: purchaseId }),
            { items: payload },
            {
                onSuccess: () => {
                    toast.success("Recepción registrada correctamente.");
                    setOpen(false);
                },
                onError: (errors) => {
                    const msg =
                        (errors && (Object.values(errors) as string[]).flat().join(" ")) ||
                        "No se pudo registrar la recepción.";
                    toast.error(msg);
                },
                onFinish: () => setProcessing(false),
                preserveScroll: true,
            }
        );
    };

    const nothingToReceive = items.every((it) => Number(qtys[it.id] ?? 0) <= 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 pos-hover">
                    <Check className="h-4 w-4" />
                    Recibir
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Recepción de Productos
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Ingresa las cantidades recibidas. Puedes pegar desde Excel/Sheets (una columna).
                    </DialogDescription>
                </DialogHeader>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="switch-recibir-todo"
                                checked={receiveAllToggle}
                                onCheckedChange={handleReceiveAllToggle}
                                disabled={!hasRows || processing}
                            />
                            <Label htmlFor="switch-recibir-todo" className="cursor-pointer">
                                Recibir todo
                            </Label>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            disabled={processing}
                            className="gap-2 pos-button-primary"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Limpiar
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Pendiente total:{" "}
                        <span className="font-medium">{totals.pendingTotal.toLocaleString()}</span>{" "}
                        • A recibir:{" "}
                        <span className="font-medium">{totals.toReceive.toLocaleString()}</span>
                    </div>
                </div>

                <Separator />

                {/* Tabla */}
                <div className="rounded-md border scrollbar-stoneretail overflow-x-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead className="min-w-[260px]">Producto</TableHead>
                                <TableHead className="w-28 text-center">Pendiente</TableHead>
                                <TableHead className="w-36 text-center">Recibido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => {
                                const raw = qtys[it.id];
                                const n = Number(raw ?? 0);
                                const invalid = !Number.isNaN(n) && n > it.pending;
                                return (
                                    <TableRow key={it.id} className="align-middle">
                                        <TableCell>
                                            <div className="font-medium">{it.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {it.id}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{it.pending}</TableCell>
                                        <TableCell>
                                            <div className="relative flex items-center pos-focus">
                                                <Input
                                                    ref={(el) => { inputsRef.current[idx] = el; }}
                                                    aria-label={`Cantidad recibida para ${it.name}`}
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={0}
                                                    step="0.01"
                                                    max={it.pending}
                                                    className={cn(
                                                        "w-full text-right pr-9 pos-input",
                                                        invalid && "border-red-500 focus-visible:ring-red-500"
                                                    )}
                                                    value={raw ?? ""}
                                                    onChange={(e) => setQty(it.id, e.target.value)}
                                                    onKeyDown={onKeyDown(idx, it)}
                                                    onPaste={(e) => handlePaste(idx, e)}
                                                    placeholder="0"
                                                    disabled={processing}
                                                />
                                                {invalid ? (
                                                    <AlertCircle className="absolute right-2 h-5 w-5 text-red-500" />
                                                ) : (
                                                    <ClipboardPaste className="absolute right-2 h-4 w-4 text-muted-foreground opacity-70" />
                                                )}
                                            </div>
                                            {invalid && (
                                                <div className="mt-1 text-xs text-red-600">
                                                    No puede exceder {it.pending}.
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!hasRows && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                                        No hay líneas pendientes de recibir.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                        Tip: pega una columna de cantidades desde Excel/Sheets en cualquiera de los campos.
                    </div>
                    <Button onClick={submit} disabled={processing || nothingToReceive || !hasRows}>
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando…
                            </>
                        ) : (
                            "Confirmar Recepción"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
