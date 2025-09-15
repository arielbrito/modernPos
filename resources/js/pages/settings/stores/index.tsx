/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, PencilLine, Trash2, Eye, Search, X, Loader2, StoreIcon, Filter, Download, ArrowUpDown, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BreadcrumbItem, Store } from "@/types";
import { StoreForm } from "./partials/store-form";
import { DeleteStoreDialog } from "./partials/delete-store-dialog";
import { cn } from "@/lib/utils";
import stores from "@/routes/stores";
import { Badge } from "@/components/ui/badge";

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
interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Pagination<T> {
    data: T[];
    links: PaginationLink[];
    meta?: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

interface Filters {
    q?: string;
    status?: 'all' | 'active' | 'inactive';
    currency?: string;
    sort?: 'name' | 'created_at' | 'updated_at';
    direction?: 'asc' | 'desc';
    per_page?: number;
}

interface Props {
    tiendas: Pagination<Store>;
    filters: Filters;
    currencies?: string[];
}

// --- SUB-COMPONENTES ---
const Pagination = ({ links, meta }: { links: PaginationLink[], meta?: any }) => {
    if (links?.length <= 3) return null;

    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Información de resultados */}
            {meta && (
                <div className="text-sm text-muted-foreground">
                    Mostrando {((meta.current_page - 1) * meta.per_page) + 1} a {Math.min(meta.current_page * meta.per_page, meta.total)} de {meta.total} resultados
                </div>
            )}

            {/* Enlaces de paginación */}
            <div className="flex items-center gap-1">
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
        </div>
    );
};

const StatusBadge = ({ active }: { active: boolean }) => (
    <Badge variant={active ? "default" : "secondary"}>
        {active ? "Activo" : "Inactivo"}
    </Badge>
);

const EmptyState = ({ hasFilters, onClear }: { hasFilters: boolean, onClear: () => void }) => (
    <TableRow>
        <TableCell colSpan={6} className="h-32 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <StoreIcon className="h-8 w-8 opacity-50" />
                <p className="text-lg font-medium">
                    {hasFilters ? "No se encontraron tiendas con los filtros aplicados" : "No hay tiendas registradas"}
                </p>
                <p className="text-sm">
                    {hasFilters ? "Intenta ajustar los filtros de búsqueda" : "Comienza agregando tu primera tienda"}
                </p>
                {hasFilters && (
                    <Button variant="outline" size="sm" onClick={onClear}>
                        Limpiar filtros
                    </Button>
                )}
            </div>
        </TableCell>
    </TableRow>
);

// --- COMPONENTE PRINCIPAL ---
export default function StoreIndex({ tiendas, filters, currencies = [] }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Tiendas", href: stores.index.url() },
    ];

    // Estados para filtros
    const [q, setQ] = React.useState(filters?.q || "");
    const [status, setStatus] = React.useState(filters?.status || "all");
    const [currency, setCurrency] = React.useState(filters?.currency || "");
    const [sort, setSort] = React.useState(filters?.sort || "name");
    const [direction, setDirection] = React.useState(filters?.direction || "asc");
    const [perPage, setPerPage] = React.useState(filters?.per_page || 10);

    const [isSearching, setIsSearching] = React.useState(false);
    const [showFilters, setShowFilters] = React.useState(false);
    const debouncedSearch = useDebounce(q, 300);

    // Estados para modales
    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<Store | null>(null);
    const [openDelete, setOpenDelete] = React.useState(false);
    const [toDeleteId, setToDeleteId] = React.useState<number | null>(null);

    // Estados para selección múltiple
    const [selectedItems, setSelectedItems] = React.useState<number[]>([]);
    const [selectAll, setSelectAll] = React.useState(false);

    // Efecto para búsqueda
    React.useEffect(() => {
        const hasChanged =
            debouncedSearch !== filters.q ||
            status !== filters.status ||
            currency !== filters.currency ||
            sort !== filters.sort ||
            direction !== filters.direction ||
            perPage !== filters.per_page;

        if (hasChanged) {
            setIsSearching(true);
            const params: any = {};
            if (debouncedSearch) params.q = debouncedSearch;
            if (status !== "all") params.status = status;
            if (currency) params.currency = currency;
            if (sort !== "name") params.sort = sort;
            if (direction !== "asc") params.direction = direction;
            if (perPage !== 10) params.per_page = perPage;

            router.get(stores.index.url(), params, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsSearching(false),
            });
        }
    }, [debouncedSearch, status, currency, sort, direction, perPage]);

    // Funciones de manejo
    const handleEdit = (tienda: Store) => {
        setEditing(tienda);
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

    const handleSort = (column: string) => {
        if (sort === column) {
            setDirection(direction === "asc" ? "desc" : "asc");
        } else {
            setSort(column as 'name' | 'created_at' | 'updated_at');
            setDirection("asc");
        }
    };

    const clearFilters = () => {
        setQ("");
        setStatus("all");
        setCurrency("");
        setSort("name");
        setDirection("asc");
        setPerPage(10);
        setShowFilters(false);
    };

    const hasActiveFilters = Boolean(q || status !== "all" || currency || sort !== "name" || direction !== "asc");

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems([]);
        } else {
            setSelectedItems(tiendas.data.map(s => s.id!));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectItem = (id: number) => {
        setSelectedItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const exportData = () => {
        // Implementar lógica de exportación
        console.log("Exportando datos...");
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tiendas" />
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6 flex items-center gap-3">
                    <StoreIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold">Gestión de Tiendas y Sucursales</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Administra todas las tiendas y sucursales de tu negocio
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    Listado de Tiendas
                                    {tiendas.meta && (
                                        <Badge variant="outline" className="ml-2">
                                            {tiendas.meta.total}
                                        </Badge>
                                    )}
                                </CardTitle>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={cn("gap-2", showFilters && "bg-muted")}
                                    >
                                        <Filter className="h-4 w-4" />
                                        Filtros
                                        {hasActiveFilters && (
                                            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                                                !
                                            </Badge>
                                        )}
                                    </Button>

                                    <Button variant="outline" size="sm" onClick={exportData} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Exportar
                                    </Button>

                                    <Button onClick={handleCreate} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        <span className="hidden sm:inline">Nueva Tienda</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Barra de búsqueda principal */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, RNC, teléfono..."
                                    value={q}
                                    onChange={(e) => {
                                        setQ(e.target.value);
                                        if (!isSearching) setIsSearching(true);
                                    }}
                                    className="pl-10 pr-10"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {q && !isSearching && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                        onClick={() => setQ('')}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Panel de filtros avanzados */}
                            {showFilters && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Estado</label>
                                        <Select value={status} onValueChange={(value) => setStatus(value as 'all' | 'active' | 'inactive')}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="active">Activos</SelectItem>
                                                <SelectItem value="inactive">Inactivos</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Moneda</label>
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                {currencies.map(curr => (
                                                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ordenar por</label>
                                        <Select value={sort} onValueChange={(value) => setSort(value as 'name' | 'created_at' | 'updated_at')}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name">Nombre</SelectItem>
                                                <SelectItem value="created_at">Fecha creación</SelectItem>
                                                <SelectItem value="updated_at">Última actualización</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Elementos por página</label>
                                        <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-2 lg:col-span-4 flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={clearFilters}>
                                            Limpiar filtros
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Acciones de selección múltiple */}
                            {selectedItems.length > 0 && (
                                <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                    <span className="text-sm font-medium">
                                        {selectedItems.length} elemento{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            Cambiar estado
                                        </Button>
                                        <Button variant="destructive" size="sm">
                                            Eliminar seleccionados
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setSelectedItems([]); setSelectAll(false); }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('name')}
                                                className="h-8 p-0 font-semibold hover:bg-transparent"
                                            >
                                                Nombre
                                                <ArrowUpDown className="ml-1 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Contacto</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('updated_at')}
                                                className="h-8 p-0 font-semibold hover:bg-transparent"
                                            >
                                                Actualizado
                                                <ArrowUpDown className="ml-1 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tiendas?.data.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(s.id!)}
                                                    onChange={() => handleSelectItem(s.id!)}
                                                    className="rounded border-gray-300"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {s.rnc ? `RNC: ${s.rnc}` : "Sin RNC"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{s.phone || "—"}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-32">
                                                    {s.address || "Sin dirección"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{s.currency || "—"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge active={!!s.is_active} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {s.updated_at && new Date(s.updated_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild>
                                                            <Link href={stores.show.url({ store: Number(s.id) })}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                Ver detalles
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(s)}>
                                                            <PencilLine className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(s.id!)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {tiendas?.data.length === 0 && (
                                        <EmptyState
                                            hasFilters={!!hasActiveFilters}
                                            onClear={clearFilters}
                                        />
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination links={tiendas?.links} meta={tiendas?.meta} />
                    </CardContent>
                </Card>
            </div>

            {/* Modales */}
            <StoreForm open={openForm} onOpenChange={setOpenForm} store={editing || undefined} />
            <DeleteStoreDialog open={openDelete} onOpenChange={setOpenDelete} storeId={toDeleteId} />
        </AppLayout>
    );
}