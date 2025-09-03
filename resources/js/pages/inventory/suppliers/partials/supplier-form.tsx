/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { useForm } from "@inertiajs/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SupplierController from "@/actions/App/Http/Controllers/Inventory/SupplierController";
import { Switch } from "@/components/ui/switch";

export type Supplier = {
    id?: number;
    name: string;
    rnc?: string | null;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    is_active: boolean;

};

export function SupplierForm({
    open,
    onOpenChange,
    supplier,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    supplier?: Supplier | null; // si viene con id -> edita; si no -> crea
}) {
    const isEdit = Boolean(supplier?.id);

    const { data, setData, processing, errors, reset, post, put, clearErrors } = useForm<Required<Supplier>>({
        id: supplier?.id ?? 0,
        name: supplier?.name ?? "",
        rnc: supplier?.rnc ?? "",
        contact_person: supplier?.contact_person ?? "",
        phone: supplier?.phone ?? "",
        email: supplier?.email ?? "",
        address: supplier?.address ?? "",
        is_active: supplier?.is_active ?? "",
    } as any);

    React.useEffect(() => {
        // sincroniza cuando cambia el proveedor a editar
        setData({
            id: supplier?.id ?? 0,
            name: supplier?.name ?? "",
            rnc: supplier?.rnc ?? "",
            contact_person: supplier?.contact_person ?? "",
            phone: supplier?.phone ?? "",
            email: supplier?.email ?? "",
            address: supplier?.address ?? "",
            is_active: supplier?.is_active ?? "",
        } as any);
        clearErrors();
    }, [supplier]);

    const close = () => {
        onOpenChange(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && supplier?.id) {
            put(SupplierController.update.url({ supplier: supplier.id }), {
                onSuccess: () => { toast.success("Proveedor actualizado"); close(); },
                onError: () => toast.error("No se pudo actualizar"),
                preserveScroll: true,
            });
        } else {
            post(SupplierController.store.url(), {
                onSuccess: () => { toast.success("Proveedor creado"); close(); },
                onError: () => toast.error("Revisa los campos"),
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
                    <DialogDescription>Crea o edita un proveedor </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <Label>Nombre</Label>
                            <Input value={data.name} onChange={(e) => setData("name", e.target.value)} />
                            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label>RNC</Label>
                            <Input value={data.rnc || ""} onChange={(e) => setData("rnc", e.target.value)} />
                            {errors.rnc && <p className="text-xs text-rose-600 mt-1">{errors.rnc}</p>}
                        </div>
                        <div>
                            <Label>Persona de Contacto</Label>
                            <Input value={data.contact_person || ""} onChange={(e) => setData("contact_person", e.target.value)} />
                        </div>
                        <div>
                            <Label>Teléfono</Label>
                            <Input value={data.phone || ""} onChange={(e) => setData("phone", e.target.value)} />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input type="email" value={data.email || ""} onChange={(e) => setData("email", e.target.value)} />
                            {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <Label>Dirección</Label>
                            <Textarea rows={2} value={data.address || ""} onChange={(e) => setData("address", e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>Activo</Label>
                            <Switch
                                checked={data.is_active}
                                onCheckedChange={(checked) => setData('is_active', checked)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={processing}>{isEdit ? "Guardar" : "Crear"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
