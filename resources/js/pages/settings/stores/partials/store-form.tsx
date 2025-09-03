/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { router, useForm } from "@inertiajs/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Store } from "@/types";
import { Switch } from "@/components/ui/switch";
import stores from "@/routes/stores"; // usa helper de rutas

import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { CURRENCY } from "@/constants/currency";

type StorePayload = {
    id?: number;
    name: string;
    rnc?: string | null;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    currency: string;           // ISO / código soportado
    logo?: File | null;         // archivo opcional
    is_active: boolean;         // boolean real
};

export function StoreForm({
    open,
    onOpenChange,
    store,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    store?: Store | null; // si viene con id -> edita; si no -> crea
}) {
    const isEdit = Boolean(store?.id);

    const {
        data,
        setData,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm<StorePayload>({
        id: store?.id,
        name: store?.name ?? "",
        rnc: store?.rnc ?? "",
        phone: store?.phone ?? "",
        address: store?.address ?? "",
        email: store?.email ?? "",
        currency: store?.currency ?? "",
        logo: null, // al editar no enviamos logo a menos que el usuario cargue uno nuevo
        is_active: Boolean(store?.is_active ?? true),
    });

    // Sincroniza cuando cambia la tienda a editar o cuando abres el dialog
    React.useEffect(() => {
        setData({
            id: store?.id,
            name: store?.name ?? "",
            rnc: store?.rnc ?? "",
            phone: store?.phone ?? "",
            address: store?.address ?? "",
            email: store?.email ?? "",
            currency: store?.currency ?? "",
            logo: null,
            is_active: Boolean(store?.is_active ?? true),
        });
        clearErrors();
    }, [store, open]);

    // // Omite logo si no se subió archivo nuevo (evita "borrar" el existente)
    // transform((payload) => {
    //     const p: any = { ...payload };
    //     if (!p.logo) delete p.logo;
    //     if (!isEdit) delete p.id;
    //     return p;
    // });

    const close = () => {
        onOpenChange(false);
        reset();       // limpia valores del estado
        clearErrors(); // limpia errores de validación
    };



    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: any = { ...data };
        if (!payload.logo) delete payload.logo;
        if (!isEdit) delete payload.id;
        if (isEdit) payload._method = "put";

        router.post(
            isEdit ? stores.update.url({ store: store!.id! }) : stores.store.url(),
            payload,
            {
                forceFormData: true,               // 👈 clave
                preserveScroll: true,
                onSuccess: () => { toast.success(isEdit ? "Tienda actualizada" : "Tienda creada"); close(); },

                onError: () => toast.error("Revisa los campos"),
            }
        );
    };



    return (
        <Dialog open={open} onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) { reset(); clearErrors(); }
        }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Tienda" : "Nueva Sucursal"}</DialogTitle>
                    <DialogDescription>Crea o edita una tienda o sucursal</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <Label>Nombre</Label>
                            <Input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <Label>RNC</Label>
                            <Input
                                value={data.rnc ?? ""}
                                onChange={(e) => setData("rnc", e.target.value)}
                            />
                            {errors.rnc && <p className="text-xs text-rose-600 mt-1">{errors.rnc}</p>}
                        </div>

                        <div>
                            <Label>Teléfono</Label>
                            <Input
                                value={data.phone ?? ""}
                                onChange={(e) => setData("phone", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={data.email ?? ""}
                                onChange={(e) => setData("email", e.target.value)}
                            />
                            {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <Label>Moneda</Label>
                            <Select
                                value={data.currency}
                                onValueChange={(value) => setData("currency", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar moneda" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCY.map((C) => (
                                        <SelectItem key={C.value} value={C.value}>
                                            {C.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.currency && <p className="text-xs text-rose-600 mt-1">{errors.currency}</p>}
                        </div>

                        <div>
                            <Label>Logo</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setData("logo", e.target.files?.[0] ?? null)}
                            />
                            {errors.logo && <p className="text-xs text-rose-600 mt-1">{errors.logo}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <Label>Dirección</Label>
                            <Textarea
                                rows={2}
                                value={data.address ?? ""}
                                onChange={(e) => setData("address", e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="is_active">Activo</Label>
                            <Switch
                                id="is_active"
                                checked={!!data.is_active}
                                onCheckedChange={(checked) => setData("is_active", checked)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={close} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {isEdit ? "Guardar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
