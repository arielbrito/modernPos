/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, UserSquare2, PencilLine, Trash2, Eye, Search, X, Loader2 } from "lucide-react";
import type { BreadcrumbItem } from "@/types";
import { SupplierForm, type Supplier } from "./partials/supplier-form";
import { DeleteSupplierDialog } from "./partials/delete-supplier-dialog";
import { cn } from "@/lib/utils";
import suppliers from "@/routes/inventory/suppliers";
import SupplierController from "@/actions/App/Http/Controllers/Inventory/SupplierController";

// --- HOOK PARA DEBOUNCE ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- TIPOS ---
interface PaginationLink { url: string | null; label: string; active: boolean; }
interface Pagination<T> {
    data: T[];
    links: PaginationLink[];
    meta?: any;
}
interface Props {
    supliers: Pagination<Supplier & { purchases_count?: number }>;
    filters: { q?: string };
}

// --- SUB-COMPONENTES ---
const Pagination = ({ links }: { links: PaginationLink[] }) => {
    if (links?.length <= 3) return null;
    return (
        <div className="mt-6 flex items-center justify-center gap-1">
            {links?.map((link, index) => (
                <Link
                    key={index}
                    href={link.url ?? '#'}
                    preserveScroll
                    preserveState
                    className={cn(
                        "flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors",
                        link.active && "border-primary bg-primary text-primary-foreground",
                        !link.url && "cursor-not-allowed text-muted-foreground opacity-50",
                        link.url && !link.active && "hover:bg-muted"
                    )}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
export default function SuppliersIndex({ supliers, filters }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Proveedores", href: suppliers.index.url() },
    ];

    const [q, setQ] = React.useState(filters?.q || "");
    const [isSearching, setIsSearching] = React.useState(false);
    const debouncedSearch = useDebounce(q, 300);

    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<Supplier | null>(null);
    const [openDelete, setOpenDelete] = React.useState(false);
    const [toDeleteId, setToDeleteId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (debouncedSearch !== filters.q) {
            setIsSearching(true);
            router.get((SupplierController.index()), { q: debouncedSearch || undefined }, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsSearching(false),
            });
        }
    }, [debouncedSearch]);

    const handleEdit = (supplier: Supplier) => {
        setEditing(supplier);
        setOpenForm(true);
    };

    const handleCreate = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleDelete = (id: number) => {
        setToDeleteId(id);
        setOpenDelete(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6 flex items-center gap-3">
                    <UserSquare2 className="h-6 w-6 text-muted-foreground" />
                    <h1 className="text-2xl font-semibold">Gestión de Proveedores</h1>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle>Listado de Proveedores</CardTitle>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre, RNC, etc."
                                        value={q}
                                        onChange={(e) => {
                                            setQ(e.target.value);
                                            if (!isSearching) setIsSearching(true);
                                        }}
                                        className="pl-10"
                                    />
                                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                    {q && !isSearching && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setQ('')}><X className="h-4 w-4" /></Button>}
                                </div>
                                <Button onClick={handleCreate} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Nuevo Proveedor</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead className="text-center">Compras</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {supliers?.data.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-muted-foreground">{s.rnc || "Sin RNC"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{s.contact_person || "—"}</div>
                                                <div className="text-xs text-muted-foreground">{s.email || "Sin email"}</div>
                                            </TableCell>
                                            <TableCell>{s.phone || "—"}</TableCell>
                                            <TableCell className="text-center">{s.purchases_count ?? 0}</TableCell>
                                            <TableCell className="text-right">
                                                <TooltipProvider delayDuration={100}>
                                                    <div className="flex justify-end gap-2">
                                                        <Tooltip><TooltipTrigger asChild><Link href={(suppliers.show.url({ supplier: Number(s.id) }))}><Button size="icon" variant="outline"><Eye className="h-4 w-4" /></Button></Link></TooltipTrigger><TooltipContent>Ver Detalles</TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button size="icon" variant="secondary" onClick={() => handleEdit(s)}><PencilLine className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button size="icon" variant="destructive" onClick={() => handleDelete(s.id!)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Eliminar</TooltipContent></Tooltip>
                                                    </div>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {supliers?.data.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No se encontraron proveedores.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <Pagination links={supliers?.links} />
                    </CardContent>
                </Card>
            </div>

            {/* Modales */}
            <SupplierForm open={openForm} onOpenChange={setOpenForm} supplier={editing || undefined} />
            <DeleteSupplierDialog open={openDelete} onOpenChange={setOpenDelete} supplierId={toDeleteId} />
        </AppLayout>
    );
}
