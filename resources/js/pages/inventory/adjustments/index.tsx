import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";

// LAYOUT, COMPONENTS & ICONS
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, Plus, ArrowUp, ArrowDown, TrendingUp, TrendingDown, FilePlus, Users, Eye } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// UTILS, TYPES & ACTIONS
import type { BreadcrumbItem, Paginated, InventoryAdjustment, User, Store } from "@/types";
import { money } from "@/utils/inventory";
import { fmtDate } from "@/utils/date";
import InventoryAdjustmentController from "@/actions/App/Http/Controllers/Inventory/InventoryAdjustmentController";

interface Props {
    adjustments: Paginated<InventoryAdjustment & { items_count: number; user: User; store: Store; }>;
    stats: {
        total_units_in: number;
        total_units_out: number;
        total_value_in: number;
        total_value_out: number;
        net_value_change: number;
        count: number;
    };
    filters: { from: string; to: string; };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Ajustes de Inventario", href: InventoryAdjustmentController.index.url() },
];

// KPI con tooltip (no rompe si no usas tooltip)
function Kpi({
    title,
    value,
    icon,
    hint,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    hint?: string;
}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className="cursor-help">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            {icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value}</div>
                        </CardContent>
                    </Card>
                </TooltipTrigger>
                {hint && <TooltipContent>{hint}</TooltipContent>}
            </Tooltip>
        </TooltipProvider>
    );
}

export default function IndexInventoryAdjustments({ adjustments, stats, filters }: Props) {
    // estado UI
    const [isLoading, setIsLoading] = React.useState(false);

    // filtros locales
    const [localFilters, setLocalFilters] = React.useState(() => ({
        from: filters.from ? new Date(filters.from) : new Date(Date.now() - 30 * 864e5),
        to: filters.to ? new Date(filters.to) : new Date(),
    }));

    // sincroniza cuando vuelves con back/forward y cambian los props
    React.useEffect(() => {
        setLocalFilters({
            from: filters.from ? new Date(filters.from) : new Date(Date.now() - 30 * 864e5),
            to: filters.to ? new Date(filters.to) : new Date(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.from, filters.to]);

    const debouncedSubmit = useDebouncedCallback((newFilters) => {
        setIsLoading(true);
        router.get(InventoryAdjustmentController.index.url(), newFilters, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
        });
    }, 500);

    const handleFilterChange = (newFilterValues: typeof localFilters) => {
        setLocalFilters(newFilterValues);
        debouncedSubmit({
            from: newFilterValues.from.toISOString().split("T")[0],
            to: newFilterValues.to.toISOString().split("T")[0],
        });
    };

    // atajos de teclado: N (simple) / M (masivo)
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tgt = e.target as HTMLElement | null;
            if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.getAttribute("contenteditable") === "true")) return;

            const k = e.key.toLowerCase();
            if (k === "n") {
                router.visit(InventoryAdjustmentController.create.url(), { preserveScroll: true });
            } else if (k === "m") {
                router.visit(InventoryAdjustmentController.bulkCreate.url(), { preserveScroll: true });
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // helpers para presets de fecha (evitamos props personalizados en el picker para no romper TS)
    const setPreset = (days: number) => {
        const to = new Date();
        const from = new Date(Date.now() - days * 864e5);
        handleFilterChange({ from, to });
    };
    const setThisMonth = () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        handleFilterChange({ from, to: new Date() });
    };
    const setThisYear = () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), 0, 1);
        handleFilterChange({ from, to: new Date() });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ajustes de Inventario" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* ENCABEZADO Y ACCIONES */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Ajustes de Inventario</h1>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <DateRangePicker
                                date={{ from: localFilters.from, to: localFilters.to }}
                                onDateChange={(range) => {
                                    if (range?.from && range?.to) {
                                        handleFilterChange({ ...localFilters, from: range.from, to: range.to });
                                    }
                                }}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={isLoading}
                                aria-label="Recargar"
                                onClick={() =>
                                    debouncedSubmit({
                                        from: localFilters.from.toISOString().split("T")[0],
                                        to: localFilters.to.toISOString().split("T")[0],
                                    })
                                }
                            >
                                {isLoading ? <span className="animate-spin">⏳</span> : <span>↻</span>}
                            </Button>
                        </div>

                        {/* Presets simples, compatibles con cualquier DateRangePicker */}
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => setPreset(7)} aria-label="Últimos 7 días">7d</Button>
                            <Button variant="outline" size="sm" onClick={() => setPreset(30)} aria-label="Últimos 30 días">30d</Button>
                            <Button variant="outline" size="sm" onClick={setThisMonth} aria-label="Este mes">Mes</Button>
                            <Button variant="outline" size="sm" onClick={setThisYear} aria-label="Este año">Año</Button>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Nuevo Ajuste
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={InventoryAdjustmentController.create.url()}>
                                        <FilePlus className="mr-2 h-4 w-4" /> Ajuste Simple
                                        <span className="ml-auto text-xs text-muted-foreground">N</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={InventoryAdjustmentController.bulkCreate.url()}>
                                        <Users className="mr-2 h-4 w-4" /> Ajuste Masivo (Conteo)
                                        <span className="ml-auto text-xs text-muted-foreground">M</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi
                        title="Unidades Entradas"
                        value={stats.total_units_in.toLocaleString()}
                        icon={<ArrowUp className="h-4 w-4 text-green-500" />}
                        hint="Suma de cantidades de ajustes tipo entrada en el rango."
                    />
                    <Kpi
                        title="Unidades Salidas"
                        value={stats.total_units_out.toLocaleString()}
                        icon={<ArrowDown className="h-4 w-4 text-red-500" />}
                        hint="Suma de cantidades de ajustes tipo salida en el rango."
                    />
                    <Kpi
                        title="Valor Neto del Ajuste"
                        value={money(stats.net_value_change)}
                        icon={
                            stats.net_value_change >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )
                        }
                        hint="Entradas ($) - Salidas ($) en el rango."
                    />
                    <Kpi
                        title="Total de Ajustes"
                        value={stats.count.toLocaleString()}
                        icon={<Package className="h-4 w-4 text-muted-foreground" />}
                        hint="Cantidad de documentos de ajuste en el rango."
                    />
                </div>

                {/* TABLA */}
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Ajustes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative overflow-x-auto">
                            <Table className="[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:bg-background">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Motivo</TableHead>
                                        <TableHead>Tienda</TableHead>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead className="text-right"># Items</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adjustments.data.length > 0 ? (
                                        adjustments.data.map((adj) => (
                                            <TableRow
                                                key={adj.id}
                                                className="cursor-pointer odd:bg-muted/30 hover:bg-muted transition-colors"
                                                onClick={() =>
                                                    router.visit(InventoryAdjustmentController.show({ adjustment: Number(adj.id) }))
                                                }
                                            >
                                                <TableCell>{fmtDate(adj.adjustment_date)}</TableCell>
                                                <TableCell className="font-mono">{adj.code}</TableCell>
                                                <TableCell className="max-w-[280px] truncate">{adj.reason}</TableCell>
                                                <TableCell>{adj.store.name}</TableCell>
                                                <TableCell>{adj.user?.name || "N/A"}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="inline-flex items-center justify-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                                                        {adj.items_count}
                                                    </span>
                                                </TableCell>
                                                <TableCell
                                                    className="text-right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Link
                                                        href={InventoryAdjustmentController.show({ adjustment: Number(adj.id) })}
                                                        aria-label={`Ver ajuste ${adj.code}`}
                                                    >
                                                        <Button size="icon" variant="ghost">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-12">
                                                <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                                                    <Package className="h-10 w-10 opacity-30" />
                                                    <p>No hay ajustes en el período seleccionado.</p>
                                                    <div className="flex gap-2">
                                                        <Link href={InventoryAdjustmentController.create.url()}>
                                                            <Button className="gap-2">
                                                                <FilePlus className="h-4 w-4" /> Nuevo ajuste
                                                            </Button>
                                                        </Link>
                                                        <Link href={InventoryAdjustmentController.bulkCreate.url()}>
                                                            <Button variant="outline" className="gap-2">
                                                                <Users className="h-4 w-4" /> Conteo masivo
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination className="mt-4" links={adjustments.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
