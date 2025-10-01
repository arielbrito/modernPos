import * as React from "react";
import { useForm, Link } from "@inertiajs/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Role, Permission } from "@/types";
import RoleController from "@/actions/App/Http/Controllers/Settings/RoleController";
import {
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Lock,
    Star,
    Save,
    X,
    Search
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePermissionSelection } from "../hooks/usePermissionSelection";

interface Props {
    role?: Role;
    groupedPermissions: Record<string, Permission[]>;
    assignedPermissionIds?: number[];
}

/** Resalta coincidencias del query en un texto */
function Highlight({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const norm = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const t = norm(text);
    const q = norm(query);
    const idx = t.indexOf(q);
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

/** Devuelve estado checked/indeterminate para un grupo dado el Set actual */
function useGroupState(currentIds: Set<number>, groupIds: number[]) {
    const selected = React.useMemo(() => groupIds.filter(id => currentIds.has(id)).length, [currentIds, groupIds]);
    const total = groupIds.length;
    const checked = total > 0 && selected === total;
    const ind = selected > 0 && selected < total;
    return { checked, ind, selected, total };
}

export default function RoleForm({ role, groupedPermissions, assignedPermissionIds = [] }: Props) {
    const prefersReduced = useReducedMotion();

    // --- Form Inertia (solo para name / submit) ---
    const { data, setData, post, put, processing, errors } = useForm({
        name: role?.name || "",
        permissions: assignedPermissionIds, // mantenemos sincronizado para compatibilidad
    });

    const isEditing = !!role;
    const isSuperAdmin = data.name === "Super-Admin";

    // --- Selección con Set + helpers idempotentes ---
    const selection = usePermissionSelection(assignedPermissionIds);

    // sincroniza hacia Inertia form cada vez que el Set cambia (sin loops):
    const syncToForm = React.useCallback(() => {
        setData("permissions", selection.getArray());
    }, [setData, selection]);
    // efecto: tras cada mutación llamaremos manualmente a syncToForm

    // --- Búsqueda (debounced) ---
    const [rawQuery, setRawQuery] = React.useState("");
    const query = useDebouncedValue(rawQuery, 220);
    const hasQuery = query.trim().length > 0;

    const normalize = React.useCallback((s: string) =>
        s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim()
        , []);
    const normQuery = normalize(query);

    const filteredGrouped = React.useMemo(() => {
        if (!hasQuery) return groupedPermissions;
        const out: Record<string, Permission[]> = {};
        for (const [group, perms] of Object.entries(groupedPermissions)) {
            const groupMatch = normalize(group).includes(normQuery);
            const items = groupMatch ? perms : perms.filter(p => normalize(p.name).includes(normQuery));
            if (items.length) out[group] = items;
        }
        return out;
    }, [groupedPermissions, hasQuery, normQuery, normalize]);

    const allPermissionIds = React.useMemo(
        () => Object.values(groupedPermissions).flat().map(p => p.id),
        [groupedPermissions]
    );
    const visibleIds = React.useMemo(
        () => Object.values(filteredGrouped).flat().map(p => p.id),
        [filteredGrouped]
    );

    const allSelected = React.useMemo(() => {
        if (!allPermissionIds.length) return false;
        const cur = new Set(selection.values);
        return allPermissionIds.every(id => cur.has(id));
    }, [allPermissionIds, selection.values]);

    const visiblesSelected = React.useMemo(() => {
        if (!visibleIds.length) return false;
        const cur = new Set(selection.values);
        return visibleIds.every(id => cur.has(id));
    }, [visibleIds, selection.values]);

    // --- Acciones globales ---
    const handleToggleAll = React.useCallback(() => {
        if (allSelected) selection.removeMany(allPermissionIds);
        else selection.addMany(allPermissionIds);
        syncToForm();
    }, [allSelected, allPermissionIds, selection, syncToForm]);

    const handleToggleVisibles = React.useCallback(() => {
        if (!hasQuery) return;
        if (visiblesSelected) selection.removeMany(visibleIds);
        else selection.addMany(visibleIds);
        syncToForm();
    }, [hasQuery, visiblesSelected, visibleIds, selection, syncToForm]);

    // --- Submit con diff (para métricas internas/telemetría si quieres) ---
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const { added, removed } = selection.computeDiff();
        // Podrías trackear added/removed aquí (telemetría / toast contextual)
        if (isEditing) {
            put(RoleController.update.url({ role: role!.id }));
        } else {
            post(RoleController.store.url());
        }
    };

    // --- Métricas UI ---
    const totalPermissions = React.useMemo(
        () => Object.values(groupedPermissions).flat().length,
        [groupedPermissions]
    );
    const selectedCount = selection.size;
    const selectedPct = totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0;
    const visibleTotal = visibleIds.length;

    // --- Atajos de teclado ---
    React.useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const isMeta = e.ctrlKey || e.metaKey;
            if (isMeta && e.key.toLowerCase() === "s") {
                e.preventDefault();
                (document.getElementById("btn-submit-role") as HTMLButtonElement)?.click();
            }
            if (isMeta && e.key.toLowerCase() === "a") {
                e.preventDefault();
                if (hasQuery) handleToggleVisibles(); else handleToggleAll();
            }
            if (e.key === "Escape") {
                const cancel = document.getElementById("btn-cancel-role") as HTMLAnchorElement | null;
                if (cancel) cancel.click();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hasQuery, handleToggleAll, handleToggleVisibles]);

    // --- Threshold para virtualizar (por grupo) ---
    const VIRTUALIZE_THRESHOLD = 300;

    return (
        <form onSubmit={submit}>
            <Card className="border-2 border-border/50 rounded-2xl shadow-xl overflow-hidden">
                {/* Header con gradiente */}
                <div className="relative bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10 border-b-2 border-border/30">
                    <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail"></div>

                    <CardHeader className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-primary/20 rounded-xl p-2 border border-primary/30">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-2xl font-bold">
                                    {isEditing ? "Editar Rol" : "Crear Nuevo Rol"}
                                </CardTitle>
                                <CardDescription className="font-medium">
                                    Define el nombre del rol y configura sus permisos de acceso
                                </CardDescription>
                            </div>
                            {isSuperAdmin && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
                                    <Lock className="w-3 h-3 mr-1" />
                                    Protegido
                                </Badge>
                            )}
                        </div>

                        {/* Barra de acciones STICKY */}
                        <div className="sticky top-0 z-10 mt-4 rounded-xl border border-border/30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <div className="grid grid-cols-12 gap-3 p-4">
                                {/* Fila 1: métricas + acciones */}
                                <div className="col-span-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    {/* Métricas */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-muted-foreground">Permisos seleccionados</span>
                                        <span className="text-sm font-bold text-primary">
                                            {selectedCount} / {totalPermissions} ({selectedPct}%)
                                        </span>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-2">
                                        {hasQuery && (
                                            <Button
                                                type="button"
                                                variant={visiblesSelected ? "secondary" : "default"}
                                                onClick={handleToggleVisibles}
                                                disabled={processing || isSuperAdmin || visibleTotal === 0}
                                                className="rounded-xl"
                                                title="Ctrl/Cmd + A"
                                            >
                                                {visiblesSelected ? "Quitar visibles" : "Asignar visibles"}
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant={allSelected ? "secondary" : "default"}
                                            onClick={handleToggleAll}
                                            disabled={processing || isSuperAdmin}
                                            className="rounded-xl"
                                            title="Ctrl/Cmd + A"
                                        >
                                            {allSelected ? "Quitar todos" : "Asignar todos"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Barra de progreso (ocupa 12 col) */}
                                <div className="col-span-12">
                                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                                        <motion.div
                                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${selectedPct}%` }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>

                                {/* Fila 2: Buscador (7) + Nombre (5) */}
                                <div className="col-span-12 grid grid-cols-12 gap-3">
                                    {/* Buscador */}
                                    <div className="col-span-12 md:col-span-7">
                                        <div className="relative">
                                            <Label htmlFor="perm-search" className="sr-only">Buscar permisos</Label>
                                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="perm-search"
                                                value={rawQuery}
                                                onChange={(e) => setRawQuery(e.target.value)}
                                                placeholder="Buscar por nombre de permiso o grupo…"
                                                className="h-11 w-full rounded-xl pl-9 text-sm"
                                            />
                                            {rawQuery && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                    onClick={() => setRawQuery("")}
                                                    aria-label="Limpiar búsqueda"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasQuery && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Mostrando {visibleTotal} permiso{visibleTotal === 1 ? "" : "s"} coincidente{visibleTotal === 1 ? "" : "s"}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nombre del rol */}
                                    <div className="col-span-12 md:col-span-5">
                                        <Label htmlFor="role-name" className="mb-1 block text-sm font-semibold">
                                            <span className="inline-flex items-center gap-2">
                                                <Star className="h-4 w-4 text-primary" />
                                                Nombre del Rol
                                            </span>
                                        </Label>
                                        <Input
                                            id="role-name"
                                            value={data.name}
                                            onChange={(e) => setData("name", e.target.value)}
                                            disabled={processing || isSuperAdmin}
                                            required
                                            placeholder="Ej: Gerente de Tienda, Cajero, etc."
                                            className="h-11 w-full rounded-xl text-sm"
                                        />
                                        {errors.name && (
                                            <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
                                                <AlertCircle className="h-3 w-3" />
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </CardHeader>
                </div>

                <CardContent className="space-y-6 p-6">
                    {/* Contador de grupos visibles */}
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Permisos del Rol
                        </Label>
                        <Badge variant="secondary" className="px-3 py-1">
                            {Object.keys(filteredGrouped).length} Grupo{Object.keys(filteredGrouped).length === 1 ? "" : "s"}
                        </Badge>
                    </div>

                    {/* Lista de grupos */}
                    <div className="space-y-4">
                        {Object.entries(filteredGrouped).map(([group, permissions], index) => {
                            const groupIds = permissions.map(p => p.id);
                            const curSet = new Set(selection.values);
                            const { checked, ind, selected, total } = useGroupState(curSet, groupIds);

                            // Virtualiza por grupo si es muy largo
                            const shouldVirtualize = permissions.length >= VIRTUALIZE_THRESHOLD;

                            return (
                                <motion.fieldset
                                    key={group}
                                    aria-labelledby={`legend-${index}`}
                                    initial={prefersReduced ? undefined : { opacity: 0, y: 20 }}
                                    animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                                    transition={prefersReduced ? undefined : { duration: 0.3, delay: index * 0.05 }}
                                    className="group/card p-5 border-2 border-border/50 rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm"
                                >
                                    {/* Header del grupo */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${checked ? "bg-primary/20 border border-primary/30" : "bg-muted border border-border/30"}`}>
                                                <CheckCircle2 className={`w-4 h-4 ${checked ? "text-primary" : "text-muted-foreground"}`} />
                                            </div>
                                            <div>
                                                <legend id={`legend-${index}`} className="font-bold text-foreground group-hover/card:text-primary transition-colors">
                                                    <Highlight text={group} query={query} />
                                                </legend>
                                                <p className="text-xs text-muted-foreground">
                                                    {selected} de {total} seleccionados
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Label
                                                htmlFor={`select-all-${index}`}
                                                className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                            >
                                                Seleccionar todo
                                            </Label>
                                            <Checkbox
                                                id={`select-all-${index}`}
                                                checked={checked}
                                                // Radix Checkbox acepta 'indeterminate'
                                                // @ts-expect-error radix supports string
                                                indeterminate={ind}
                                                onCheckedChange={(state) => {
                                                    const next = state === true;
                                                    // idempotente
                                                    if (next) selection.addMany(groupIds);
                                                    else selection.removeMany(groupIds);
                                                    syncToForm();
                                                }}
                                                className="h-5 w-5 rounded-md"
                                                aria-checked={ind ? "mixed" : checked}
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4"></div>

                                    {/* Grid de permisos */}
                                    {!shouldVirtualize ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {permissions.map((permission) => {
                                                const isChecked = curSet.has(permission.id);
                                                return (
                                                    <div
                                                        key={permission.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${isChecked
                                                            ? "bg-primary/10 border-primary/30 shadow-sm"
                                                            : "bg-background border-border/30 hover:border-primary/20 hover:bg-accent/20"
                                                            }`}
                                                    >
                                                        <Checkbox
                                                            id={`permission-${permission.id}`}
                                                            checked={!!isChecked}
                                                            onCheckedChange={(checked) => {
                                                                selection.setOne(permission.id, checked === true);
                                                                syncToForm();
                                                            }}
                                                            className="h-4 w-4 rounded-md"
                                                        />
                                                        <Label
                                                            htmlFor={`permission-${permission.id}`}
                                                            className={`text-sm font-medium cursor-pointer flex-1 ${isChecked ? "text-primary" : "text-foreground"}`}
                                                        >
                                                            <Highlight text={permission.name} query={query} />
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        // fallback simple cuando el grupo es gigante: paginado/virtual básico
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-auto pr-1">
                                            {permissions.map((permission) => {
                                                const isChecked = curSet.has(permission.id);
                                                return (
                                                    <div
                                                        key={permission.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${isChecked
                                                            ? "bg-primary/10 border-primary/30 shadow-sm"
                                                            : "bg-background border-border/30 hover:border-primary/20 hover:bg-accent/20"
                                                            }`}
                                                    >
                                                        <Checkbox
                                                            id={`permission-${permission.id}`}
                                                            checked={!!isChecked}
                                                            onCheckedChange={(checked) => {
                                                                selection.setOne(permission.id, checked === true);
                                                                syncToForm();
                                                            }}
                                                            className="h-4 w-4 rounded-md"
                                                        />
                                                        <Label
                                                            htmlFor={`permission-${permission.id}`}
                                                            className={`text-sm font-medium cursor-pointer flex-1 ${isChecked ? "text-primary" : "text-foreground"}`}
                                                        >
                                                            <Highlight text={permission.name} query={query} />
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.fieldset>
                            );
                        })}
                    </div>

                    {errors.permissions && (
                        <p className="text-sm text-destructive mt-3 flex items-center gap-2 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                            <AlertCircle className="w-4 h-4" />
                            {errors.permissions}
                        </p>
                    )}
                </CardContent>

                {/* Footer */}
                <CardFooter className="flex justify-end gap-3 p-6 bg-gradient-to-r from-accent/10 to-background border-t-2 border-border/30">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="rounded-xl border-2 hover:border-primary/40 transition-all duration-200"
                    >
                        <Link id="btn-cancel-role" href={RoleController.index.url()} className="flex items-center gap-2">
                            <X className="w-4 h-4" />
                            Cancelar
                        </Link>
                    </Button>

                    <motion.div whileHover={prefersReduced ? undefined : { scale: 1.05 }} whileTap={prefersReduced ? undefined : { scale: 0.95 }}>
                        <Button
                            id="btn-submit-role"
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-200 relative overflow-hidden group min-w-[140px]"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Rol
                                </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        </Button>
                    </motion.div>
                </CardFooter>
            </Card>
        </form>
    );
}
