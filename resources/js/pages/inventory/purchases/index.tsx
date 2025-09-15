/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import { toast } from "sonner";

// --- LAYOUT & COMPONENTS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pagination } from "@/components/pagination";
import { fmtDate } from "@/utils/date";

// --- ICONS ---
import { Package, Eye, CheckCircle, XCircle, MoreVertical, Search, Loader2, Filter, X } from "lucide-react";

// --- UTILS & PARTIALS ---
import { StatusBadge } from "./partials/status-badge";
import { money } from "@/utils/inventory";
import purchases from "@/routes/inventory/purchases";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

// --- TYPESCRIPT TYPES ---
type BreadcrumbItem = {
    title: string;
    href: string;
};

type Supplier = {
    id: number;
    name: string;
};

type PurchaseStatus = "draft" | "approved" | "partially_received" | "received" | "cancelled";

type Purchase = {
    id: number;
    code: string;
    status: PurchaseStatus;
    supplier: Supplier;
    invoice_number?: string | null;
    invoice_date?: string | null;
    grand_total: number;
    balance_total: number;
};

type PageLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedResponse<T> = {
    data: T[];
    links: PageLink[];

    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;

};

type Filters = {
    search: string;
    status: string;
};

interface Props {
    compras: PaginatedResponse<Purchase>;
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: purchases.index.url() },
];

// --- CUSTOM HOOKS ---
const useDebounce = (callback: () => void, delay: number) => {
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    return React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(callback, delay);
    }, [callback, delay]);
};

const usePurchaseActions = () => {
    const [loadingStates, setLoadingStates] = React.useState<{
        approving: number | null;
        cancelling: number | null;
    }>({
        approving: null,
        cancelling: null,
    });

    const approvePurchase = React.useCallback((id: number) => {
        setLoadingStates(prev => ({ ...prev, approving: id }));
        router.post(PurchaseController.approve.url({ purchase: id }), {}, {
            onSuccess: () => {
                toast.success("Compra aprobada con éxito.");
                setLoadingStates(prev => ({ ...prev, approving: null }));
            },
            onError: (errors) => {
                const message = Object.values(errors).flat().join(', ') || "No se pudo aprobar la compra.";
                toast.error(message);
                setLoadingStates(prev => ({ ...prev, approving: null }));
            },
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const cancelPurchase = React.useCallback((id: number) => {
        setLoadingStates(prev => ({ ...prev, cancelling: id }));
        router.post(PurchaseController.cancel.url({ purchase: id }), {}, {
            onSuccess: () => {
                toast.success("Compra cancelada correctamente.");
                setLoadingStates(prev => ({ ...prev, cancelling: null }));
            },
            onError: (errors) => {
                const message = Object.values(errors).flat().join(', ') || "No se pudo cancelar la compra.";
                toast.error(message);
                setLoadingStates(prev => ({ ...prev, cancelling: null }));
            },
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    return { approvePurchase, cancelPurchase, loadingStates };
};

// --- COMPONENTS ---
const SearchFilter = React.memo<{
    search: string;
    status: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onClearFilters: () => void;
}>(({ search, status, onSearchChange, onStatusChange, onClearFilters }) => {
    const hasFilters = search || status !== 'all';

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código, proveedor..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                        value={status}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="approved">Aprobado</option>
                        <option value="partially_received">Parcialmente Recibido</option>
                        <option value="received">Recibido</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
            </div>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                </Button>
            )}
        </div>
    );
});

const ActionMenu = React.memo<{
    purchase: Purchase;
    onApprove: (id: number) => void;
    onCancel: (id: number) => void;
    loadingStates: { approving: number | null; cancelling: number | null };
}>(({ purchase, onApprove, onCancel, loadingStates }) => {
    const nonCancelableStatuses: PurchaseStatus[] = ["received", "partially_received", "cancelled"];
    const canCancel = !nonCancelableStatuses.includes(purchase.status);
    const canApprove = purchase.status === "draft";

    const isApproving = loadingStates.approving === purchase.id;
    const isCancelling = loadingStates.cancelling === purchase.id;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isApproving || isCancelling}>
                    {(isApproving || isCancelling) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <MoreVertical className="h-4 w-4" />
                    )}
                    <span className="sr-only">Abrir menú</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={purchases.show.url({ purchase: purchase.id })}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                    </Link>
                </DropdownMenuItem>

                {canApprove && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Aprobar
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción marcará la compra <strong>{purchase.code}</strong> como aprobada y no se podrá editar.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onApprove(purchase.id)}
                                    disabled={isApproving}
                                >
                                    {isApproving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Aprobando...
                                        </>
                                    ) : (
                                        "Confirmar"
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Compra
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de cancelar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer y anulará la orden de compra <strong>{purchase.code}</strong> permanentemente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => onCancel(purchase.id)}
                                    disabled={isCancelling}
                                >
                                    {isCancelling ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Cancelando...
                                        </>
                                    ) : (
                                        "Sí, Cancelar"
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

const PurchaseRow = React.memo<{
    purchase: Purchase;
    onApprove: (id: number) => void;
    onCancel: (id: number) => void;
    loadingStates: { approving: number | null; cancelling: number | null };
}>(({ purchase, onApprove, onCancel, loadingStates }) => {
    const isLoading = loadingStates.approving === purchase.id || loadingStates.cancelling === purchase.id;

    return (
        <TableRow
            className={`hover:bg-muted/50 transition-colors ${isLoading ? 'opacity-60' : ''}`}
            data-testid={`purchase-row-${purchase.id}`}
        >
            <TableCell className="font-mono text-sm font-medium">{purchase.code}</TableCell>
            <TableCell className="font-medium">{purchase.supplier?.name || "Sin proveedor"}</TableCell>
            <TableCell>
                <StatusBadge status={purchase.status} />
            </TableCell>
            <TableCell>
                <div className="space-y-1">
                    <div className="font-medium text-sm">
                        {purchase.invoice_number || "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {fmtDate(purchase.invoice_date) || "Sin fecha"}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="font-medium font-mono text-sm">
                    {money(purchase.grand_total)}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="font-medium text-destructive font-mono text-sm">
                    {money(purchase.balance_total)}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <ActionMenu
                    purchase={purchase}
                    onApprove={onApprove}
                    onCancel={onCancel}
                    loadingStates={loadingStates}
                />
            </TableCell>
        </TableRow>
    );
});

const MobilePurchaseCard = React.memo<{
    purchase: Purchase;
    onApprove: (id: number) => void;
    onCancel: (id: number) => void;
    loadingStates: { approving: number | null; cancelling: number | null };
}>(({ purchase, onApprove, onCancel, loadingStates }) => {
    const isLoading = loadingStates.approving === purchase.id || loadingStates.cancelling === purchase.id;

    return (
        <Card className={`mb-4 lg:hidden transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="font-mono text-sm font-bold">{purchase.code}</div>
                        <div className="text-sm text-muted-foreground">{purchase.supplier?.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={purchase.status} />
                        <ActionMenu
                            purchase={purchase}
                            onApprove={onApprove}
                            onCancel={onCancel}
                            loadingStates={loadingStates}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-muted-foreground mb-1">Factura</div>
                        <div className="font-medium">{purchase.invoice_number || "N/A"}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground mb-1">Fecha</div>
                        <div>{fmtDate(purchase.invoice_date) || "Sin fecha"}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-sm">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-mono font-bold">{money(purchase.grand_total)}</div>
                    </div>
                    <div className="text-sm text-right">
                        <div className="text-muted-foreground">Balance</div>
                        <div className="font-mono font-bold text-destructive">{money(purchase.balance_total)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

const EmptyState = React.memo(() => (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="rounded-full bg-muted p-6">
            <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">No se encontraron compras</h3>
            <p className="text-muted-foreground max-w-md">
                No hay compras que coincidan con los filtros actuales. Intenta ajustar los filtros o crear una nueva orden de compra.
            </p>
        </div>
        <Button asChild className="mt-4">
            <Link href={PurchaseController.create.url()}>
                <Package className="mr-2 h-4 w-4" />
                Crear Nueva Compra
            </Link>
        </Button>
    </div>
));

// --- MAIN COMPONENT ---
export default function Index({ compras, filters }: Props) {
    const { data, setData, get } = useForm<Filters>({
        search: filters.search || '',
        status: filters.status || 'all',
    });

    const { approvePurchase, cancelPurchase, loadingStates } = usePurchaseActions();

    // Debounced search
    const debouncedSearch = useDebounce(() => {
        get(PurchaseController.index.url(), {
            preserveState: true,
            preserveScroll: true,
        });
    }, 300);

    const handleSearchChange = React.useCallback((value: string) => {
        setData('search', value);
        debouncedSearch();
    }, [setData, debouncedSearch]);

    const handleStatusChange = React.useCallback((value: string) => {
        setData('status', value);
        get(PurchaseController.index.url(), {
            preserveState: true,
            preserveScroll: true,
        });
    }, [setData, get]);

    const handleClearFilters = React.useCallback(() => {
        setData({
            search: '',
            status: 'all',
        });
        get(PurchaseController.index.url(), {
            preserveState: true,
            preserveScroll: true,
        });
    }, [setData, get]);

    const purchaseStats = React.useMemo(() => {
        const total = compras.total;
        const currentPage = compras.current_page;
        const perPage = compras.data?.length;
        const from = compras.from;
        const to = compras.to;

        return { total, currentPage, perPage, from, to };
    }, [compras, compras.data.length]);

    console.log(compras.total)

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compras" />
            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                            <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de Compras</h1>
                            <p className="text-sm text-muted-foreground">
                                {purchaseStats.total > 0 && (
                                    `Mostrando ${purchaseStats.from}-${purchaseStats.to} de ${purchaseStats.total} compras`
                                )}
                            </p>
                        </div>
                    </div>
                    <Button asChild size="default">
                        <Link href={PurchaseController.create.url()}>
                            <Package className="mr-2 h-4 w-4" />
                            Nueva Compra
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SearchFilter
                            search={data.search}
                            status={data.status}
                            onSearchChange={handleSearchChange}
                            onStatusChange={handleStatusChange}
                            onClearFilters={handleClearFilters}
                        />
                    </CardContent>
                </Card>

                {/* Content */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Listado de Compras</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {compras.data.length > 0 ? (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden lg:block">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-background z-10">
                                                <TableRow>
                                                    <TableHead className="w-[120px]">Código</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead>Factura / Fecha</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="text-right">Balance</TableHead>
                                                    <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {compras.data.map((purchase) => (
                                                    <PurchaseRow
                                                        key={purchase.id}
                                                        purchase={purchase}
                                                        onApprove={approvePurchase}
                                                        onCancel={cancelPurchase}
                                                        loadingStates={loadingStates}
                                                    />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Mobile Cards */}
                                <div className="lg:hidden p-4">
                                    {compras.data.map((purchase) => (
                                        <MobilePurchaseCard
                                            key={purchase.id}
                                            purchase={purchase}
                                            onApprove={approvePurchase}
                                            onCancel={cancelPurchase}
                                            loadingStates={loadingStates}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="p-4 border-t">
                                    <Pagination links={compras.links} />
                                </div>
                            </>
                        ) : (
                            <EmptyState />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}