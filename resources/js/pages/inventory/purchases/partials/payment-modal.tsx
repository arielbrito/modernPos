import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import dayjs from "dayjs";

// --- COMPONENTS ---
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    DollarSign,
    Calendar,
    FileText,
    StickyNote,
} from "lucide-react";

// --- CONSTANTS & UTILS ---
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/payments";
import { money } from "@/utils/inventory";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchaseId: number;
    /** Balance pendiente de la compra */
    maxAmount: number;
    /** Etiqueta opcional de moneda (ej: "RD$ ") */
    currencyLabel?: string;
}

export function PaymentModal({ purchaseId, maxAmount, currencyLabel = "" }: Props) {
    const [open, setOpen] = React.useState(false);
    const amountRef = React.useRef<HTMLInputElement>(null);

    const initialState = React.useMemo(
        () => ({
            method: "cash" as PaymentMethod,
            paid_amount: Number(maxAmount) || 0,
            paid_at: dayjs().format("YYYY-MM-DDTHH:mm"),
            reference: "",
            notes: "",
        }),
        [maxAmount]
    );

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm(initialState);

    const clampAmount = (v: number) => {
        if (Number.isNaN(v) || v < 0) return 0;
        return v > maxAmount ? maxAmount : v;
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            // Reinit cada vez que abre
            reset();
            clearErrors();
            setData("paid_amount", clampAmount(maxAmount));
            setData("paid_at", dayjs().format("YYYY-MM-DDTHH:mm"));
            // autofocus suave
            setTimeout(() => amountRef.current?.focus(), 50);
        }
        setOpen(isOpen);
    };

    const setFullPayment = () => setData("paid_amount", clampAmount(maxAmount));

    const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const asNumber = Number(raw);
        setData("paid_amount", clampAmount(asNumber));
    };

    const remaining = Math.max(0, Number(maxAmount) - Number(data.paid_amount || 0));
    const disabledByNoBalance = maxAmount <= 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validación rápida en cliente
        const amount = clampAmount(Number(data.paid_amount));
        if (disabledByNoBalance) {
            toast.info("Esta compra no tiene balance pendiente.");
            return;
        }
        if (amount <= 0) {
            toast.error("El monto debe ser mayor a 0.");
            return;
        }

        post(PurchaseController.storePayment.url({ purchase: purchaseId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Pago registrado con éxito");
                setOpen(false);
            },
            onError: (errs) => {
                const message =
                    Object.values(errs).flat().join(" ") || "Error al registrar el pago.";
                toast.error(message);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="gap-2" disabled={disabledByNoBalance}>
                    <DollarSign className="h-4 w-4" />
                    Registrar Pago
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar un nuevo pago</DialogTitle>
                    <DialogDescription>
                        Balance pendiente:{" "}
                        <span className="font-bold text-foreground">
                            {currencyLabel}
                            {money(maxAmount)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} id="payment-form" className="grid gap-5 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Método */}
                        <div>
                            <Label htmlFor="method">Método de pago</Label>
                            <Select
                                value={data.method}
                                onValueChange={(v: PaymentMethod) => setData("method", v)}
                                disabled={processing}
                            >
                                <SelectTrigger id="method">
                                    <div className="flex items-center gap-2">
                                        {PAYMENT_METHODS.find((m) => m.value === data.method)?.icon}
                                        <SelectValue placeholder="Selecciona método" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            <div className="flex items-center gap-2">
                                                {m.icon}
                                                <span>{m.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.method && (
                                <p className="mt-1 text-xs text-red-500">{errors.method}</p>
                            )}
                        </div>

                        {/* Monto */}
                        <div>
                            <Label htmlFor="amount">Monto a pagar</Label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={maxAmount}
                                    value={String(data.paid_amount ?? "")}
                                    onChange={onAmountChange}
                                    className={`pl-10 ${errors.paid_amount ? "border-red-500" : ""}`}
                                    disabled={processing}
                                    ref={amountRef}
                                />
                            </div>
                            {errors.paid_amount && (
                                <p className="mt-1 text-xs text-red-500">{errors.paid_amount}</p>
                            )}
                            <div className="mt-1 text-xs text-muted-foreground">
                                Queda después de este pago:{" "}
                                <strong>
                                    {currencyLabel}
                                    {money(remaining)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Fecha */}
                    <div>
                        <Label htmlFor="paid_at">Fecha y hora del pago</Label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="paid_at"
                                type="datetime-local"
                                value={data.paid_at}
                                onChange={(e) => setData("paid_at", e.target.value)}
                                className="pl-10"
                                disabled={processing}
                            />
                        </div>
                        {errors.paid_at && (
                            <p className="mt-1 text-xs text-red-500">{errors.paid_at}</p>
                        )}
                    </div>

                    {/* Ref */}
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
                        {errors.reference && (
                            <p className="mt-1 text-xs text-red-500">{errors.reference}</p>
                        )}
                    </div>

                    {/* Notas */}
                    <div>
                        <Label htmlFor="notes">Notas (Opcional)</Label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-3 top-0">
                                <StickyNote className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Textarea
                                id="notes"
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData("notes", e.target.value)}
                                className="pl-10"
                                placeholder="Abono a factura F-BC-00123..."
                                disabled={processing}
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={setFullPayment}
                        disabled={processing || disabledByNoBalance}
                    >
                        Pagar saldo completo
                    </Button>
                    <Button
                        type="submit"
                        form="payment-form"
                        disabled={processing || disabledByNoBalance}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Pago"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
