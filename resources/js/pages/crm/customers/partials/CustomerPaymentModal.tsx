import * as React from "react";
import { useForm, usePage } from "@inertiajs/react";
import { toast } from "sonner";

// --- COMPONENTS & ICONS ---
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Banknote, CreditCard, Landmark } from "lucide-react";
import { money } from "@/utils/inventory";

// --- UTILS, TYPES & ACTIONS ---
import type { Customer } from "@/types";
import CustomerPaymentController from "@/actions/App/Http/Controllers/CRM/CustomerPaymentController";
interface RegisterLite {
    id: number;
    name: string;
}
interface CustomerLite {
    id: number;
    name: string;
    balance: number;
}

interface Props {
    customer: Customer | null;
    registers: RegisterLite[]; // Lista de cajas activas para pagos en efectivo
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
    { value: 'transfer', label: 'Transferencia', icon: <Landmark className="h-4 w-4" /> },
    { value: 'card', label: 'Tarjeta', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'other', label: 'Otro', icon: <DollarSign className="h-4 w-4" /> },
];

export function CustomerPaymentModal({ customer, registers, isOpen, setIsOpen }: Props) {

    // const [isOpen, setIsOpen] = React.useState(false);
    const { props } = usePage();
    const activeRegisterId = (props.context as any)?.active_register?.id;

    console.log(customer)

    if (!isOpen || !customer) {
        return null;
    }

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: customer.balance > 0 ? String(customer.balance) : '',
        payment_date: new Date().toISOString().split('T')[0],
        method: 'cash',
        notes: '',
        register_id: activeRegisterId || (registers.length > 0 ? registers[0].id : ''),
    });


    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(CustomerPaymentController.store.url({ customer: customer.id }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Abono registrado exitosamente.");
                setIsOpen(false);
                reset();
            },
            onError: (errs) => {
                toast.error("Error al registrar el abono.", {
                    description: Object.values(errs).flat().join(" "),
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <DollarSign className="h-4 w-4" /> Registrar Abono
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Abono a Cliente</DialogTitle>
                    <DialogDescription>
                        El balance actual de {customer.name} es de <strong>${money(customer.balance)}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} id="payment-form" className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="amount">Monto del Abono</Label>
                        <Input id="amount" type="number" step="0.01" max={customer.balance} value={data.amount} onChange={e => setData('amount', e.target.value)} autoFocus />
                        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                        <Label htmlFor="payment_date">Fecha del Pago</Label>
                        <Input id="payment_date" type="date" value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} />
                        {errors.payment_date && <p className="text-xs text-red-500 mt-1">{errors.payment_date}</p>}
                    </div>
                    <div>
                        <Label htmlFor="method">Método de Pago</Label>
                        <Select value={data.method} onValueChange={(v: 'cash' | 'card' | 'transfer' | 'other') => setData('method', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {data.method === 'cash' && (
                        <div>
                            <Label htmlFor="register_id">Abonar a Caja</Label>
                            <Select value={String(data.register_id)} onValueChange={v => setData('register_id', Number(v))}>
                                <SelectTrigger><SelectValue placeholder="Seleccione una caja..." /></SelectTrigger>
                                <SelectContent>
                                    {registers.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {errors.register_id && <p className="text-xs text-red-500 mt-1">{errors.register_id}</p>}
                        </div>
                    )}
                </form>
                <DialogFooter>
                    <Button type="submit" form="payment-form" disabled={processing}>
                        {processing ? "Registrando..." : "Confirmar Abono"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}