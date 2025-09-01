
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
import { Package, Eye, CheckCircle, XCircle, MoreVertical, Search } from "lucide-react";

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
    meta: {
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
};

interface Props {
    compras: PaginatedResponse<Purchase>;
    filters: { search: string }; // Para mantener el estado de los filtros
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Compras", href: purchases.index.url() },
];

// --- COMPONENT ---
export default function Index({ compras, filters }: Props) {

    // Hook de Inertia para manejar el estado del filtro de búsqueda
    const { data, setData, get } = useForm({
        search: filters.search || '',
    });

    // Función para manejar la búsqueda cuando se presiona Enter
    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        get(PurchaseController.index.url(), {
            preserveState: true,
        });
    }

    // --- ACCIONES MEMOIZADAS ---
    const approvePurchase = React.useCallback((id: number) => {
        router.post(PurchaseController.approve.url({ id }), {}, {
            onSuccess: () => toast.success("Compra aprobada con éxito."),
            onError: () => toast.error("No se pudo aprobar la compra."),
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const cancelPurchase = React.useCallback((id: number) => {
        router.post(PurchaseController.cancel.url({ id }), {}, {
            onSuccess: () => toast.success("Compra cancelada correctamente."),
            onError: () => toast.error("No se pudo cancelar la compra."),
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const nonCancelableStatuses: PurchaseStatus[] = ["received", "partially_received", "cancelled"];

    // --- SUB-COMPONENTS DE RENDERIZADO ---
    const renderEmptyState = () => (
        <TableRow>
            <TableCell colSpan={7}>
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">No se encontraron compras</h3>
                    <p className="text-muted-foreground">Intenta con otros filtros o crea una nueva orden de compra.</p>
                    <Button asChild className="mt-2">
                        <Link href={PurchaseController.create.url()}>Crear Nueva Compra</Link>
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );



    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compras" />
            <div className="mx-auto max-w-7xl p-4 md:p-6">
                <div className="mb-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Package className="h-7 w-7" />
                        <h1 className="text-2xl font-bold">Gestión de Compras</h1>
                    </div>
                    <Button asChild>
                        <Link href='#'>Crear Nueva Compra</Link>
                    </Button>
                </div>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Listado</CardTitle>
                        <form onSubmit={handleSearch} className="mt-2">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por código o proveedor..."
                                    className="pl-8"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                />
                            </div>
                            {/* Nota: Un botón de búsqueda explícito puede ser útil aquí */}
                        </form>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
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
                                    {compras.data.length > 0 ? compras.data.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-muted/50">
                                            <TableCell className="font-mono text-sm">{p.code}</TableCell>
                                            <TableCell>{p.supplier?.name}</TableCell>
                                            <TableCell><StatusBadge status={p.status} /></TableCell>
                                            <TableCell>
                                                <div className="font-medium">{p.invoice_number ?? "N/A"}</div>
                                                <div className="text-xs text-muted-foreground">{fmtDate(p.invoice_date) ?? "Sin fecha"}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{money(p.grand_total)}</TableCell>
                                            <TableCell className="text-right font-medium text-destructive">{money(p.balance_total)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                            <span className="sr-only">Abrir menú</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={purchases.show.url({ purchase: p.id })}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link>
                                                        </DropdownMenuItem>
                                                        {p.status === "draft" && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><CheckCircle className="mr-2 h-4 w-4" /> Aprobar</DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle><AlertDialogDescription>Esta acción marcará la compra como aprobada y no se podrá editar.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => approvePurchase(p.id)}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                        {!nonCancelableStatuses.includes(p.status) && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50"><XCircle className="mr-2 h-4 w-4" /> Cancelar Compra</DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro de cancelar?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer y anulará la orden de compra permanentemente.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => cancelPurchase(p.id)}>Sí, Cancelar</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : renderEmptyState()}
                                </TableBody>
                            </Table>
                        </div>
                        {compras.data.length > 0 && <Pagination links={[]} />}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}