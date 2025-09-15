/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import { toast } from "sonner";

// Layout & UI
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"; // si no lo tienes, cambia por un <span>

// Icons
import { Store as StoreIcon, Plus, MoreVertical, Edit3, Power, PowerOff, Trash2, Search, CheckCircle2 } from "lucide-react";

// Partials
import { RegisterFormDialog } from "./partials/register-form-dialog";
import { Pagination } from "@/components/pagination";

// Routes (Wayfinder)
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";

// Types
type BreadcrumbItem = { title: string; href: string };

type Register = {
    id: number;
    store_id: number;
    name: string;
    active: boolean;
    open_shifts_count?: number;
};

type PageLink = { url: string | null; label: string; active: boolean };

type PaginatedResponse<T> = {
    data: T[];
    links: PageLink[];
    meta: { current_page: number; from: number; to: number; total: number; last_page: number };
};

interface Props {
    registers: PaginatedResponse<Register>;
    filters?: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Cajas", href: RegisterController.index.url() },
];

function StatusPill({ active }: { active: boolean }) {
    return (
        <Badge variant={active ? "default" : "secondary"} className={active ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
            {active ? "Activa" : "Inactiva"}
        </Badge>
    );
}

export default function Index({ registers, filters }: Props) {
    // Buscar
    const searchForm = useForm({ search: filters?.search ?? "" });
    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(RegisterController.index.url(), { search: searchForm.data.search }, { preserveState: true, preserveScroll: true });
    };

    // Crear / Editar
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Register | null>(null);

    const openCreate = () => { setEditing(null); setFormOpen(true); };
    const openEdit = (reg: Register) => { setEditing(reg); setFormOpen(true); };

    // Toggle
    const toggle = (reg: Register) => {
        router.post(RegisterController.toggle.url({ register: reg.id }), {}, {
            onSuccess: () => toast.success(`Caja ${reg.active ? "desactivada" : "activada"}.`),
            onError: () => toast.error("No se pudo actualizar el estado."),
            preserveScroll: true
        });
    };

    // Delete
    const [toDelete, setToDelete] = React.useState<Register | null>(null);
    const confirmDelete = () => {
        if (!toDelete) return;
        router.delete(RegisterController.destroy.url({ register: toDelete.id }), {
            onSuccess: () => { toast.success("Caja eliminada"); setToDelete(null); },
            onError: (err) => {
                // Mensaje de validación del backend (ej: “tiene turnos históricos”)
                const first = err?.register || Object.values(err)[0] || "No se pudo eliminar.";
                toast.error(String(first));
            },
            preserveScroll: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cajas" />
            <div className="mx-auto max-w-7xl p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <StoreIcon className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Cajas</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <form onSubmit={onSearch} className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="w-[240px] pl-8"
                                placeholder="Buscar por nombre…"
                                value={searchForm.data.search}
                                onChange={(e) => searchForm.setData("search", e.target.value)}
                            />
                        </form>
                        <Button onClick={openCreate} className="gap-2">
                            <Plus className="h-4 w-4" /> Nueva Caja
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Listado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                        <TableHead className="text-center">Turno Abierto</TableHead>
                                        <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registers.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No hay cajas registradas. Crea la primera con “Nueva Caja”.
                                            </TableCell>
                                        </TableRow>
                                    ) : registers.data.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{r.name}</TableCell>
                                            <TableCell className="text-center"><StatusPill active={r.active} /></TableCell>
                                            <TableCell className="text-center">
                                                {r.open_shifts_count && r.open_shifts_count > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700">
                                                        <CheckCircle2 className="h-4 w-4" /> Abierto
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEdit(r)}>
                                                            <Edit3 className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => toggle(r)}>
                                                            {r.active ? (
                                                                <>
                                                                    <Power className="mr-2 h-4 w-4" /> Desactivar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <PowerOff className="mr-2 h-4 w-4" /> Activar
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>¿Eliminar caja?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Esta acción es permanente. Si la caja tiene historial de turnos no podrás eliminarla (desactívala en su lugar).
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={() => { setToDelete(r); confirmDelete(); }}
                                                                    >
                                                                        Sí, eliminar
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {registers.data.length > 0 && (
                            <div className="mt-4">
                                {/* Usa tu componente de paginación real con registers.links */}
                                <Pagination links={registers.links} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <RegisterFormDialog open={formOpen} setOpen={setFormOpen} editing={editing} />
        </AppLayout>
    );
}
