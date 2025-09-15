/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { Head, router, useForm } from "@inertiajs/react";
import { toast } from "sonner";

// Layout & UI
import AppLayout from "@/layouts/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Eye, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

// Helpers de rutas (Wayfinder)
import NcfSequenceController from "@/actions/App/Http/Controllers/Fiscal/NcfSequenceController";

// Tipos
type StoreOpt = { id: number; name: string };
type NcfTypeOpt = { code: string; name: string };

type SequenceRow = {
    id: number;
    store_id: number;
    ncf_type_code: "B01" | "B02" | string;
    prefix: string | null;
    next_number: number;
    end_number: number | null;
    pad_length: number;
    active: boolean;
    store?: StoreOpt;
    type?: NcfTypeOpt;
};

type PageLink = { url: string | null; label: string; active: boolean };
type Paginated<T> = { data: T[]; links: PageLink[] };

interface Props {
    rows: Paginated<SequenceRow>;
    stores: StoreOpt[];
    types: NcfTypeOpt[];
}

const breadcrumbs = [
    { title: "Configuración", href: "#" },
    { title: "NCF", href: NcfSequenceController.index.url() },
];

export default function NcfIndex({ rows, stores, types }: Props) {
    const [open, setOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<SequenceRow | null>(null);
    const [filterStore, setFilterStore] = React.useState<string>("all");
    const [filterType, setFilterType] = React.useState<string>("all");
    const [filterStatus, setFilterStatus] = React.useState<string>("all");

    const openCreate = () => { setEditing(null); setOpen(true); };
    const openEdit = (row: SequenceRow) => { setEditing(row); setOpen(true); };

    const remove = (row: SequenceRow) => {
        router.delete(NcfSequenceController.destroy.url({ sequence: row.id }), {
            onSuccess: () => toast.success("Secuencia eliminada exitosamente"),
            onError: (errors) => {
                const errorMessage = typeof errors === 'object' && errors
                    ? Object.values(errors).flat().join(', ')
                    : "No se pudo eliminar la secuencia";
                toast.error(errorMessage);
            },
            preserveScroll: true,
        });
    };

    // Filtrado de datos
    const filteredRows = React.useMemo(() => {
        return rows.data.filter(row => {
            const matchesStore = filterStore === "all" || row.store_id === Number(filterStore);
            const matchesType = filterType === "all" || row.ncf_type_code === filterType;
            const matchesStatus = filterStatus === "all" ||
                (filterStatus === "active" && row.active) ||
                (filterStatus === "inactive" && !row.active) ||
                (filterStatus === "exhausted" && row.end_number && row.next_number > row.end_number);

            return matchesStore && matchesType && matchesStatus;
        });
    }, [rows.data, filterStore, filterType, filterStatus]);

    // Estadísticas
    const stats = React.useMemo(() => {
        const total = rows.data.length;
        const active = rows.data.filter(r => r.active).length;
        const exhausted = rows.data.filter(r => r.end_number && r.next_number > r.end_number).length;
        const nearExhaustion = rows.data.filter(r => {
            if (!r.end_number) return false;
            const remaining = r.end_number - r.next_number;
            const total = r.end_number - 1; // Asumiendo que empezó en 1
            return remaining / total <= 0.1 && remaining > 0; // Menos del 10% restante
        }).length;

        return { total, active, exhausted, nearExhaustion };
    }, [rows.data]);

    // Formatear preview con mejor lógica
    const getSequenceStatus = (row: SequenceRow) => {
        if (!row.active) return { status: 'inactive', color: 'secondary' as const };
        if (row.end_number && row.next_number > row.end_number) return { status: 'exhausted', color: 'destructive' as const };

        if (row.end_number) {
            const remaining = row.end_number - row.next_number + 1;
            const total = row.end_number;
            const percentage = remaining / total;

            if (percentage <= 0.05) return { status: 'critical', color: 'destructive' as const };
            if (percentage <= 0.15) return { status: 'warning', color: 'warning' as const };
        }

        return { status: 'active', color: 'default' as const };
    };

    const preview = (row: SequenceRow) => {
        const { status, color } = getSequenceStatus(row);
        const num = String(row.next_number).padStart(row.pad_length ?? 8, "0");
        const pref = row.prefix ?? row.ncf_type_code;
        const ncf = `${pref}${num}`;

        const statusMessages = {
            inactive: 'Inactiva',
            exhausted: 'Agotada',
            critical: 'Crítica',
            warning: 'Advertencia',
            active: 'Activa'
        };

        return (
            <div className="flex items-center gap-2">
                <Badge variant={color === 'warning' ? 'secondary' : color}>
                    {status === 'exhausted' ? 'Agotada' : ncf}
                </Badge>
                {status !== 'active' && status !== 'exhausted' && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                {status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                {status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                {status === 'inactive' && <XCircle className="h-4 w-4 text-gray-500" />}
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{statusMessages[status]}</p>
                                {row.end_number && status !== 'inactive' && (
                                    <p>Quedan: {Math.max(0, row.end_number - row.next_number + 1)} números</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        );
    };

    const clearFilters = () => {
        setFilterStore("all");
        setFilterType("all");
        setFilterStatus("all");
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión NCF" />
            <TooltipProvider>
                <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                    {/* Header con estadísticas */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de NCF</h1>
                            <p className="text-muted-foreground">Administra las secuencias de numeración comprobantes fiscales</p>
                        </div>
                        <Button onClick={openCreate} className="gap-2 md:w-auto">
                            <Plus className="h-4 w-4" /> Nueva secuencia
                        </Button>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Info className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Activas</p>
                                    <p className="text-xl font-bold">{stats.active}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Por agotar</p>
                                    <p className="text-xl font-bold">{stats.nearExhaustion}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Agotadas</p>
                                    <p className="text-xl font-bold">{stats.exhausted}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <CardTitle>Secuencias por tienda</CardTitle>

                                {/* Filtros */}
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                    <div className="flex flex-wrap gap-2">
                                        <Select value={filterStore} onValueChange={setFilterStore}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Todas las tiendas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las tiendas</SelectItem>
                                                {stores.map(store => (
                                                    <SelectItem key={store.id} value={String(store.id)}>
                                                        {store.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={filterType} onValueChange={setFilterType}>
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Todos los tipos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los tipos</SelectItem>
                                                {types.map(type => (
                                                    <SelectItem key={type.code} value={type.code}>
                                                        {type.code}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Todos los estados" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="active">Activas</SelectItem>
                                                <SelectItem value="inactive">Inactivas</SelectItem>
                                                <SelectItem value="exhausted">Agotadas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(filterStore !== "all" || filterType !== "all" || filterStatus !== "all") && (
                                        <Button variant="outline" size="sm" onClick={clearFilters}>
                                            Limpiar filtros
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tienda</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Prefijo</TableHead>
                                            <TableHead>Próximo</TableHead>
                                            <TableHead>Límite</TableHead>
                                            <TableHead>Restantes</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Preview</TableHead>
                                            <TableHead className="w-[140px] text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRows.length ? filteredRows.map((r) => {
                                            const remaining = r.end_number ? Math.max(0, r.end_number - r.next_number + 1) : null;
                                            const { status } = getSequenceStatus(r);

                                            return (
                                                <TableRow key={r.id} className={status === 'exhausted' ? 'bg-red-50/50' : status === 'critical' ? 'bg-red-50/30' : status === 'warning' ? 'bg-yellow-50/30' : ''}>
                                                    <TableCell className="font-medium">{r.store?.name ?? `#${r.store_id}`}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{r.type?.name ?? r.ncf_type_code}</div>
                                                            <div className="text-xs text-muted-foreground">{r.ncf_type_code}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{r.prefix ?? "—"}</TableCell>
                                                    <TableCell className="font-mono font-medium">{r.next_number.toLocaleString()}</TableCell>
                                                    <TableCell className="font-mono">{r.end_number?.toLocaleString() ?? "Sin límite"}</TableCell>
                                                    <TableCell className="font-mono">
                                                        {remaining !== null ? (
                                                            <span className={remaining <= 1000 ? 'text-red-600 font-medium' : remaining <= 5000 ? 'text-yellow-600' : ''}>
                                                                {remaining.toLocaleString()}
                                                            </span>
                                                        ) : "∞"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.active ? (
                                                            <Badge variant="default" className="gap-1">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Activa
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="gap-1">
                                                                <XCircle className="h-3 w-3" />
                                                                Inactiva
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{preview(r)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(r)}>
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Editar secuencia</TooltipContent>
                                                            </Tooltip>

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:text-red-700">
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta acción no se puede deshacer. Se eliminará permanentemente la secuencia para:
                                                                            <br />
                                                                            <strong>{r.store?.name} - {r.type?.name} ({r.ncf_type_code})</strong>
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => remove(r)} className="bg-red-600 hover:bg-red-700">
                                                                            Eliminar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-32 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Eye className="h-8 w-8 text-muted-foreground" />
                                                        <p className="text-muted-foreground">No hay secuencias que coincidan con los filtros</p>
                                                        {(filterStore !== "all" || filterType !== "all" || filterStatus !== "all") && (
                                                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                                                Mostrar todas
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <SequenceFormDialog
                    open={open}
                    setOpen={setOpen}
                    stores={stores}
                    types={types}
                    editing={editing}
                />
            </TooltipProvider>
        </AppLayout>
    );
}

// ======================= FORM DIALOG =======================

function SequenceFormDialog({
    open, setOpen, stores, types, editing
}: {
    open: boolean;
    setOpen: (v: boolean) => void;
    stores: StoreOpt[];
    types: NcfTypeOpt[];
    editing: SequenceRow | null;
}) {
    const isEditing = !!editing;

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        store_id: editing?.store_id ?? (stores[0]?.id ?? 1),
        ncf_type_code: (editing?.ncf_type_code as "B01" | "B02" | string) ?? (types[0]?.code ?? "B02"),
        prefix: editing?.prefix ?? "",
        next_number: editing?.next_number ?? 1,
        end_number: editing?.end_number ?? null as number | null,
        pad_length: editing?.pad_length ?? 8,
        active: editing?.active ?? true,
    });

    React.useEffect(() => {
        if (open) {
            if (isEditing && editing) {
                setData({
                    store_id: editing.store_id,
                    ncf_type_code: editing.ncf_type_code,
                    prefix: editing.prefix ?? "",
                    next_number: editing.next_number,
                    end_number: editing.end_number,
                    pad_length: editing.pad_length,
                    active: editing.active,
                });
            }
            clearErrors();
        }
        if (!open) {
            reset();
            clearErrors();
        }
    }, [open, isEditing, editing]);

    const close = () => setOpen(false);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...data,
            prefix: data.prefix.trim() || null,
        };

        if (isEditing) {
            router.put(NcfSequenceController.update.url({ sequence: editing!.id }), submitData, {
                onSuccess: () => {
                    toast.success("Secuencia actualizada exitosamente");
                    close();
                },
                onError: (errors) => {
                    const errorMessage = typeof errors === 'object' && errors
                        ? "Por favor revisa los campos marcados en rojo"
                        : "Error al actualizar la secuencia";
                    toast.error(errorMessage);
                },
                preserveScroll: true,
            });
        } else {
            post(NcfSequenceController.store.url(), {
                onSuccess: () => {
                    toast.success("Secuencia creada exitosamente");
                    close();
                },
                onError: (errors) => {
                    const errorMessage = typeof errors === 'object' && errors
                        ? "Por favor revisa los campos marcados en rojo"
                        : "Error al crear la secuencia";
                    toast.error(errorMessage);
                },
                preserveScroll: true,
            });
        }
    };

    // Validaciones en tiempo real
    const validations = React.useMemo(() => {
        const issues = [];

        if (data.next_number < 1) issues.push("El próximo número debe ser mayor a 0");
        if (data.end_number && data.end_number < data.next_number) issues.push("El límite debe ser mayor al próximo número");
        if (data.pad_length < 1 || data.pad_length > 12) issues.push("El padding debe estar entre 1 y 12");
        if (data.prefix && data.prefix.length > 10) issues.push("El prefijo no debe exceder 10 caracteres");

        return issues;
    }, [data]);

    // Preview mejorado del formulario
    const fullPreview = React.useMemo(() => {
        const pref = (data.prefix && data.prefix.trim() !== "") ? data.prefix.trim() : data.ncf_type_code;
        const num = String(data.next_number ?? 1).padStart(Number(data.pad_length ?? 8), "0");
        return `${pref}${num}`;
    }, [data.prefix, data.ncf_type_code, data.next_number, data.pad_length]);

    const remainingNumbers = React.useMemo(() => {
        if (!data.end_number) return null;
        return Math.max(0, data.end_number - data.next_number + 1);
    }, [data.end_number, data.next_number]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl">
                        {isEditing ? "Editar secuencia NCF" : "Nueva secuencia NCF"}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {isEditing
                            ? "Modifica la configuración de la secuencia existente."
                            : "Configura una nueva secuencia de numeración para comprobantes fiscales por tienda y tipo."
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Información básica */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Información básica</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="store">Tienda *</Label>
                                <Select value={String(data.store_id)} onValueChange={(v) => setData("store_id", Number(v))}>
                                    <SelectTrigger id="store">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map(s => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.store_id && <p className="text-sm text-red-500">{errors.store_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo NCF *</Label>
                                <Select value={data.ncf_type_code} onValueChange={(v) => setData("ncf_type_code", v)}>
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types.map(t => (
                                            <SelectItem key={t.code} value={t.code}>
                                                <div>
                                                    <div className="font-medium">{t.name}</div>
                                                    <div className="text-xs text-muted-foreground">{t.code}</div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.ncf_type_code && <p className="text-sm text-red-500">{errors.ncf_type_code}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Configuración de numeración */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Configuración de numeración</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prefix">
                                    Prefijo personalizado
                                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                                </Label>
                                <Input
                                    id="prefix"
                                    value={data.prefix ?? ""}
                                    onChange={(e) => setData("prefix", e.target.value)}
                                    placeholder={`Por defecto: ${data.ncf_type_code}`}
                                    maxLength={10}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Si está vacío, se usará el código del tipo NCF
                                </p>
                                {errors.prefix && <p className="text-sm text-red-500">{errors.prefix}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pad_length">Longitud de padding *</Label>
                                <Input
                                    id="pad_length"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={String(data.pad_length)}
                                    onChange={(e) => setData("pad_length", Number(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Cantidad de ceros a la izquierda (ej: 8 = 00000001)
                                </p>
                                {errors.pad_length && <p className="text-sm text-red-500">{errors.pad_length}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="next_number">Próximo correlativo *</Label>
                                <Input
                                    id="next_number"
                                    type="number"
                                    min="1"
                                    value={String(data.next_number)}
                                    onChange={(e) => setData("next_number", Number(e.target.value))}
                                />
                                {errors.next_number && <p className="text-sm text-red-500">{errors.next_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end_number">
                                    Número límite
                                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                                </Label>
                                <Input
                                    id="end_number"
                                    type="number"
                                    min="1"
                                    value={data.end_number !== null ? String(data.end_number) : ""}
                                    onChange={(e) => setData("end_number", e.target.value === "" ? null : Number(e.target.value))}
                                    placeholder="Sin límite"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Último número disponible en la secuencia
                                </p>
                                {errors.end_number && <p className="text-sm text-red-500">{errors.end_number}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Estado y preview */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Estado y vista previa</h3>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="active"
                                checked={data.active}
                                onCheckedChange={(v) => setData("active", !!v)}
                            />
                            <Label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Secuencia activa
                            </Label>
                        </div>

                        {/* Preview y estadísticas */}
                        <Card className="p-4 bg-muted/50">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Vista previa del NCF:</span>
                                    <Badge variant="outline" className="font-mono text-base px-3 py-1">
                                        {fullPreview}
                                    </Badge>
                                </div>

                                {data.end_number && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Números disponibles:</span>
                                            <span className={`font-medium ${remainingNumbers && remainingNumbers <= 1000 ? 'text-red-600' :
                                                    remainingNumbers && remainingNumbers <= 5000 ? 'text-yellow-600' :
                                                        'text-green-600'
                                                }`}>
                                                {remainingNumbers?.toLocaleString() ?? 0}
                                            </span>
                                        </div>

                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${remainingNumbers && remainingNumbers <= 1000 ? 'bg-red-500' :
                                                        remainingNumbers && remainingNumbers <= 5000 ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                    }`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(0,
                                                        data.end_number ? (remainingNumbers || 0) / (data.end_number - data.next_number + 1) * 100 : 0
                                                    ))}%`
                                                }}
                                            />
                                        </div>

                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Próximo: {data.next_number?.toLocaleString()}</span>
                                            <span>Último: {data.end_number?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Advertencias de validación */}
                        {validations.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Advertencias:</span>
                                </div>
                                <ul className="space-y-1 text-sm text-amber-600 ml-6">
                                    {validations.map((validation, index) => (
                                        <li key={index}>• {validation}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={close} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || validations.length > 0}
                            className="min-w-[120px]"
                        >
                            {processing ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {isEditing ? "Actualizando..." : "Creando..."}
                                </div>
                            ) : (
                                isEditing ? "Actualizar" : "Crear secuencia"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}