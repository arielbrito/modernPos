// resources/js/pages/inventory/purchases/partials/email-purchase-modal.tsx
import * as React from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';

export function EmailPurchaseModal({ purchase }: { purchase: any }) {
    const [open, setOpen] = React.useState(false);

    const supplierEmail = purchase?.supplier?.email ?? "";
    const subjectDefault = `Orden de compra ${purchase.code}`;

    const { data, setData, post, processing, reset, errors } = useForm({
        to: supplierEmail,
        cc: "",
        subject: subjectDefault,
        message: `Estimado proveedor,\n\nAdjuntamos la orden de compra ${purchase.code}.\n\nSaludos,`,
        attach_pdf: true,
    });

    const onOpenChange = (o: boolean) => {
        if (o) {
            reset();
            setData('to', supplierEmail);
            setData('subject', subjectDefault);
        }
        setOpen(o);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(PurchaseController.email.url({ purchase: purchase.id }), {
            onSuccess: () => { toast.success("Correo enviado"); setOpen(false); },
            onError: (errs) => toast.error("No se pudo enviar", { description: Object.values(errs).flat().join(" ") }),
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Send className="h-4 w-4" /> Enviar por email
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Enviar orden por email</DialogTitle>
                    <DialogDescription>Se adjuntará el PDF de la orden de compra.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} id="email-purchase-form" className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label>Para</Label>
                            <Input value={data.to} onChange={e => setData('to', e.target.value)} />
                            {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                        </div>
                        <div>
                            <Label>CC (opcional)</Label>
                            <Input value={data.cc} onChange={e => setData('cc', e.target.value)} />
                            {errors.cc && <p className="text-xs text-red-500 mt-1">{errors.cc}</p>}
                        </div>
                    </div>
                    <div>
                        <Label>Asunto</Label>
                        <Input value={data.subject} onChange={e => setData('subject', e.target.value)} />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>
                    <div>
                        <Label>Mensaje</Label>
                        <Textarea rows={5} value={data.message} onChange={e => setData('message', e.target.value)} />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="submit" form="email-purchase-form" disabled={processing}>
                        {processing ? "Enviando..." : "Enviar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
