// resources/js/pages/inventory/purchases/partials/show/email-purchase-modal.tsx
import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";

import type { Purchase } from "@/types";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

type EmailLog = {
    id: number;
    to: string;
    cc?: string | null;
    subject: string;
    status: "queued" | "sent" | "failed";
    created_at: string;
};

interface Props {
    open: boolean;
    setOpen: (v: boolean) => void;
    purchase: Purchase;
    lastLog?: EmailLog | null;
}

export function EmailPurchaseModal({ open, setOpen, purchase, lastLog }: Props) {
    const initial = React.useMemo(() => ({
        to: lastLog?.to ?? (purchase.supplier?.email ?? ""),
        cc: lastLog?.cc ?? "",
        subject: lastLog?.subject ?? `Orden de compra ${purchase.code}`,
        message: `Estimado proveedor,\n\nAdjuntamos la orden de compra ${purchase.code}.\n\nSaludos,`,
        paper: "letter" as "letter" | "a4",
        copy: "0" as "0" | "1",     // “Copia” impresa en PDF (marca de agua, etc.)
        queue: true,                // enviar en cola por defecto
    }), [lastLog, purchase]);

    const { data, setData, post, processing, reset, errors } = useForm(initial);

    // cuando se abre/cierra, resetea a initial
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            reset();
            setData(initial);
        }
        setOpen(isOpen);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(PurchaseController.sendEmail.url({ purchase: purchase.id }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(data.queue ? "Correo encolado para envío." : "Correo enviado.");
                setOpen(false);
            },
            onError: (errs) => {
                const msg = Object.values(errs).flat().join(" ");
                toast.error("No se pudo enviar el correo.", { description: msg });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Enviar orden por email
                    </DialogTitle>
                    <DialogDescription>
                        Se adjuntará el PDF de la orden <b>{purchase.code}</b>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} id="email-purchase-form" className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Label htmlFor="to">Para *</Label>
                            <Input
                                id="to"
                                type="email"
                                value={data.to}
                                onChange={(e) => setData("to", e.target.value)}
                                placeholder="correo@proveedor.com"
                            />
                            {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="cc">CC</Label>
                            <Input
                                id="cc"
                                type="email"
                                value={data.cc}
                                onChange={(e) => setData("cc", e.target.value)}
                                placeholder="copias@empresa.com"
                            />
                            {errors.cc && <p className="text-xs text-red-500 mt-1">{errors.cc}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="subject">Asunto *</Label>
                            <Input
                                id="subject"
                                value={data.subject}
                                onChange={(e) => setData("subject", e.target.value)}
                            />
                            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="message">Mensaje</Label>
                            <Textarea
                                id="message"
                                rows={5}
                                value={data.message}
                                onChange={(e) => setData("message", e.target.value)}
                            />
                            {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="mb-1 block">Tamaño PDF</Label>
                            <Select value={data.paper} onValueChange={(v: "letter" | "a4") => setData("paper", v)}>
                                <SelectTrigger><SelectValue placeholder="Tamaño" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="letter">Letter</SelectItem>
                                    <SelectItem value="a4">A4</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            <Checkbox id="copy" checked={data.copy === "1"} onCheckedChange={(v) => setData("copy", v ? "1" : "0")} />
                            <Label htmlFor="copy">Marcar como “Copia”</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="queue" checked={data.queue} onCheckedChange={(v) => setData("queue", Boolean(v))} />
                            <Label htmlFor="queue">Enviar en cola</Label>
                        </div>
                    </div>
                </form>

                <DialogFooter>
                    <Button type="submit" form="email-purchase-form" disabled={processing}>
                        {processing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>) : "Enviar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
