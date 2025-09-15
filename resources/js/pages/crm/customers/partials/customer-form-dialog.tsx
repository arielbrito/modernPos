/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { useForm, router } from "@inertiajs/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import CustomerController from "@/actions/App/Http/Controllers/CRM/CustomerController";
// --- INICIO DE LA ADAPTACIÓN ---
// 1. Importa el controlador de rutas de la DGII generado por Wayfinder.
//    Asegúrate de que la ruta sea correcta según la estructura de tu proyecto.
import DgiiLookupController from "@/actions/App/Http/Controllers/CRM/DgiiLookupController";
// --- FIN DE LA ADAPTACIÓN ---

type Customer = {
    id: number;
    code: string;
    name: string;
    kind: "person" | "company";
    document_type: "RNC" | "CED" | "NONE";
    document_number: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    is_taxpayer: boolean;
    active: boolean;
    allow_credit: boolean;
    credit_limit: number;
    credit_terms_days: number;
};

export function CustomerFormDialog({
    open, setOpen, editing
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    editing: Customer;
}) {
    const isEditing = !!editing;

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: editing?.name ?? "",
        kind: editing?.kind ?? "company",
        document_type: editing?.document_type ?? "NONE",
        document_number: editing?.document_number ?? "",
        email: editing?.email ?? "",
        phone: editing?.phone ?? "",
        address: editing?.address ?? "",
        is_taxpayer: editing?.is_taxpayer ?? false,
        active: editing?.active ?? true,
        allow_credit: editing?.allow_credit ?? false,
        credit_limit: editing?.credit_limit ?? 0,
        credit_terms_days: editing?.credit_terms_days ?? 0,
    });

    React.useEffect(() => {
        if (open) { clearErrors(); }
        if (open && editing) {
            setData({
                name: editing.name, kind: editing.kind, document_type: editing.document_type,
                document_number: editing.document_number ?? "", email: editing.email ?? "",
                phone: editing.phone ?? "", address: editing.address ?? "",
                is_taxpayer: editing.is_taxpayer, active: editing.active,
                allow_credit: editing.allow_credit, credit_limit: editing.credit_limit,
                credit_terms_days: editing.credit_terms_days,
            });
        }
        if (!open && !isEditing) reset();
    }, [open, editing]);

    const close = () => { setOpen(false); };

    // Lookup DGII local
    const [looking, setLooking] = React.useState(false);
    const lookupDgii = async () => {
        if (!["RNC", "CED"].includes(data.document_type) || !data.document_number) {
            toast.error("Indica tipo y número de documento antes de buscar.");
            return;
        }

        setLooking(true);
        // Implementa un AbortController para manejar el timeout en el cliente.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

        try {
            const url = DgiiLookupController.find.url({
                query: {
                    doc_type: data.document_type,
                    doc_number: data.document_number,
                }
            });

            const res = await fetch(url, {
                credentials: "same-origin",
                signal: controller.signal // Asigna la señal del AbortController
            });

            clearTimeout(timeoutId); // Limpia el timeout si la respuesta llega a tiempo

            const json = await res.json();
            if (json.found) {
                setData("name", json.name || data.name);
                setData("is_taxpayer", !!json.is_taxpayer);
                toast.success("Contribuyente encontrado");
            } else {
                toast.warning("No encontrado en padrón local");
            }
        } catch (error: any) {
            // Captura el error de aborto para dar un mensaje específico.
            if (error.name === 'AbortError') {
                toast.error("La consulta está tardando demasiado. Intenta de nuevo más tarde.");
            } else {
                toast.error("Error consultando padrón local.");
            }
        } finally {
            clearTimeout(timeoutId); // Asegura limpiar el timeout en cualquier caso.
            setLooking(false);
        }
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            router.put(CustomerController.update.url({ customer: editing!.id }), data, {
                onSuccess: () => { toast.success("Cliente actualizado"); close(); },
                onError: () => toast.error("Revisa los campos"),
                preserveScroll: true,
            });
        } else {
            post(CustomerController.store.url(), {
                onSuccess: () => { toast.success("Cliente creado"); close(); },
                onError: () => toast.error("Revisa los campos"),
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                    <DialogDescription>Completa los datos. Si es RNC/Cédula, puedes intentar buscar en el padrón local.</DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tipo de Cliente</Label>
                            <Select value={data.kind} onValueChange={(v: "person" | "company") => setData("kind", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="company">Empresa</SelectItem>
                                    <SelectItem value="person">Persona</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tipo Documento</Label>
                            <Select value={data.document_type} onValueChange={(v: "RNC" | "CED" | "NONE") => setData("document_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">Ninguno</SelectItem>
                                    <SelectItem value="RNC">RNC</SelectItem>
                                    <SelectItem value="CED">Cédula</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label>Número de Documento</Label>
                            <div className="flex gap-2">
                                <Input value={data.document_number ?? ""} onChange={(e) => setData("document_number", e.target.value)} />
                                <Button type="button" variant="outline" onClick={lookupDgii} disabled={looking}>
                                    {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            {errors.document_number && <p className="text-sm text-red-500 mt-1">{errors.document_number}</p>}
                        </div>
                        <div className="col-span-2">
                            <Label>Nombre / Razón Social</Label>
                            <Input value={data.name} onChange={(e) => setData("name", e.target.value)} />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input type="email" value={data.email ?? ""} onChange={(e) => setData("email", e.target.value)} />
                            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <Label>Teléfono</Label>
                            <Input value={data.phone ?? ""} onChange={(e) => setData("phone", e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <Label>Dirección</Label>
                            <Input value={data.address ?? ""} onChange={(e) => setData("address", e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 mt-2">
                            <Checkbox checked={data.is_taxpayer} onCheckedChange={(v) => setData("is_taxpayer", !!v)} />
                            <Label>Contribuyente</Label>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Checkbox checked={data.active} onCheckedChange={(v) => setData("active", !!v)} />
                            <Label>Activo</Label>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Checkbox checked={data.allow_credit} onCheckedChange={(v) => setData("allow_credit", !!v)} />
                            <Label>Permite crédito</Label>
                        </div>

                        <div>
                            <Label>Límite de crédito</Label>
                            <Input type="number" step="0.01" value={String(data.credit_limit)} onChange={(e) => setData("credit_limit", Number(e.target.value))} />
                        </div>
                        <div>
                            <Label>Días de crédito</Label>
                            <Input type="number" value={String(data.credit_terms_days)} onChange={(e) => setData("credit_terms_days", Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={processing}>{processing ? "Guardando..." : (isEditing ? "Actualizar" : "Crear")}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

