/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";

// UI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Routes
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";

type Register = { id: number; name: string; active: boolean };

export function RegisterFormDialog({
    open, setOpen, editing
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    editing: Register | null;
}) {
    const isEditing = !!editing;

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: editing?.name ?? "",
        active: editing?.active ?? true,
    });

    React.useEffect(() => {
        if (open) clearErrors();
        if (open && isEditing && editing) {
            setData({ name: editing.name, active: editing.active });
        }
        if (!open && !isEditing) reset();
    }, [open, isEditing, editing]);

    const close = () => setOpen(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditing && editing) {
            router.put(RegisterController.update.url({ register: editing.id }), data, {
                onSuccess: () => { toast.success("Caja actualizada"); close(); },
                onError: (err: any) => {
                    const msg = (errors.name ?? err?.active ?? Object.values(err)[0]) || "Revisa los campos.";
                    toast.error(String(msg));
                },
                preserveScroll: true,
            });
            return;
        }

        post(RegisterController.store.url(), {
            onSuccess: () => { toast.success("Caja creada"); close(); },
            onError: () => toast.error("Revisa los campos."),
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Caja" : "Nueva Caja"}</DialogTitle>
                    <DialogDescription>Define el nombre visible en la tienda. El nombre debe ser único dentro de la misma tienda.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div>
                        <Label>Nombre</Label>
                        <Input value={data.name} onChange={(e) => setData("name", e.target.value)} autoFocus />
                        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    {isEditing && (
                        <div className="flex items-center gap-2">
                            <Checkbox checked={!!data.active} onCheckedChange={(v) => setData("active", !!v)} />
                            <Label>Activa</Label>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={processing}>{processing ? "Guardando..." : "Guardar"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
