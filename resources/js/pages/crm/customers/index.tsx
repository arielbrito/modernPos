/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { toast } from "sonner";

import AppLayout from "@/layouts/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

import {
    EllipsisVertical,
    Pencil,
    Trash2,
    Download,
    Search,
    UsersRoundIcon,
    PlusCircleIcon,
    Filter,
    RefreshCw,
    Eye
} from "lucide-react";

import CustomerController from "@/actions/App/Http/Controllers/CRM/CustomerController";
import customers from "@/routes/customers";
import { CustomerFormDialog } from "./partials/customer-form-dialog";
import { Pagination } from "@/components/pagination";

// Types
type BreadcrumbItem = {
    title: string;
    href: string;
};

type DocumentType = "RNC" | "CED" | "NONE";
type CustomerKind = "person" | "company";

type Customer = {
    id: number;
    code: string;
    name: string;
    kind: CustomerKind;
    document_type: DocumentType;
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
        last_page: number;
        total: number;
        per_page: number;
        from: number;
        to: number;
    };
};

type Filters = {
    search: string;
    only_active: boolean;
    only_taxpayers: boolean;
};

interface Props {
    clientes: PaginatedResponse<Customer>;
    filters: Filters;
}

// Constants
const BREADCRUMBS: BreadcrumbItem[] = [
    { title: "Clientes", href: customers.index.url() },
];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    RNC: "RNC",
    CED: "Cédula",
    NONE: "N/D"
};

const CUSTOMER_KIND_LABELS: Record<CustomerKind, string> = {
    company: "Empresa",
    person: "Persona"
};

// Components
interface BadgeProps {
    children: React.ReactNode;
    variant: "green" | "gray" | "yellow" | "blue";
}

const Badge = React.memo<BadgeProps>(({ children, variant }) => {
    const variants = {
        green: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800",
        gray: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-200 dark:border-zinc-700",
        yellow: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800",
        blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200 dark:border-blue-800"
    } as const;

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${variants[variant]}`}>
            {children}
        </span>
    );
});

Badge.displayName = "Badge";

interface CustomerRowActionsProps {
    customer: Customer;
    onEdit: (customer: Customer) => void;
    onDelete: (customer: Customer) => void;
}

const CustomerRowActions = React.memo<CustomerRowActionsProps>(({ customer, onEdit, onDelete }) => {
    const handleEdit = React.useCallback(() => onEdit(customer), [customer, onEdit]);
    const handleDelete = React.useCallback(() => onDelete(customer), [customer, onDelete]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <EllipsisVertical className="h-4 w-4" />
                    <span className="sr-only">Abrir menú de acciones</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={CustomerController.show.url({ customer: customer.id })}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                    </Link>
                </DropdownMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cliente "{customer.name}"?</AlertDialogTitle>
                            <p className="text-sm text-muted-foreground mt-2">
                                Esta acción no se puede deshacer. El cliente será eliminado permanentemente.
                            </p>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleDelete}
                            >
                                Confirmar eliminación
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

CustomerRowActions.displayName = "CustomerRowActions";

interface FiltersFormProps {
    data: Filters;
    setData: (key: keyof Filters, value: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isLoading?: boolean;
}

const FiltersForm = React.memo<FiltersFormProps>(({ data, setData, onSubmit, isLoading = false }) => {
    const handleSearchChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setData('search', e.target.value),
        [setData]
    );

    const handleActiveChange = React.useCallback(
        (checked: boolean) => setData('only_active', checked),
        [setData]
    );

    const handleTaxpayerChange = React.useCallback(
        (checked: boolean) => setData('only_taxpayers', checked),
        [setData]
    );

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                <div className="relative sm:col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, documento o código…"
                        className="pl-10 shadow-sm"
                        value={data.search}
                        onChange={handleSearchChange}
                        disabled={isLoading}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="only-active"
                        className="border-2"
                        checked={data.only_active}
                        onCheckedChange={handleActiveChange}
                        disabled={isLoading}
                    />
                    <label htmlFor="only-active" className="text-sm font-medium leading-none cursor-pointer">
                        Solo activos
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="only-taxpayers"
                        className="border-2"
                        checked={data.only_taxpayers}
                        onCheckedChange={handleTaxpayerChange}
                        disabled={isLoading}
                    />
                    <label htmlFor="only-taxpayers" className="text-sm font-medium leading-none cursor-pointer">
                        Solo contribuyentes
                    </label>
                </div>
            </div>

            <div className="flex gap-2">
                <Button type="submit" variant="outline" size="sm" disabled={isLoading}>
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
                    Filtrar
                </Button>
            </div>
        </form>
    );
});

FiltersForm.displayName = "FiltersForm";

// Main Component
export default function CustomersIndex({ clientes: page, filters }: Props) {
    const { data, setData, get, processing } = useForm<Filters>({
        search: filters.search ?? "",
        only_active: filters.only_active ?? false,
        only_taxpayers: filters.only_taxpayers ?? false,
    });

    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<Customer | null>(null);

    // Handlers
    const submitFilters = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();
        get(CustomerController.index.url(), {
            preserveState: true,
            preserveScroll: true
        });
    }, [get]);

    const handleNewCustomer = React.useCallback(() => {
        setEditing(null);
        setOpenForm(true);
    }, []);

    const handleEditCustomer = React.useCallback((customer: Customer) => {
        setEditing(customer);
        setOpenForm(true);
    }, []);

    const handleDeleteCustomer = React.useCallback((customer: Customer) => {
        router.delete(CustomerController.destroy.url({ customer: customer.id }), {
            onSuccess: () => toast.success(`Cliente "${customer.name}" eliminado exitosamente`),
            onError: () => toast.error("No se pudo eliminar el cliente. Inténtalo de nuevo."),
            preserveScroll: true
        });
    }, []);

    const handleExportCsv = React.useCallback(() => {
        const params = new URLSearchParams({
            search: data.search || "",
            only_active: data.only_active ? "1" : "0",
            only_taxpayers: data.only_taxpayers ? "1" : "0",
            format: "csv"
        });

        const exportUrl = `${CustomerController.export.url()}?${params.toString()}`;
        window.open(exportUrl, '_blank');
    }, [data]);

    const handleFormClose = React.useCallback(() => {
        setOpenForm(false);
        setEditing(null);
    }, []);

    // Auto-submit filters with debounce
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (data.search !== filters.search) {
                get(CustomerController.index.url(), {
                    preserveState: true,
                    preserveScroll: true
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [data.search, filters.search, get]);

    const hasCustomers = page?.data && page.data.length > 0;
    const showingText = page?.meta ?
        `Mostrando ${page.meta.from} a ${page.meta.to} de ${page.meta.total} clientes` :
        '';

    return (
        <AppLayout breadcrumbs={BREADCRUMBS}>
            <Head title="Gestión de Clientes" />

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <UsersRoundIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Gestión de Clientes</h1>
                        {showingText && (
                            <p className="text-sm text-muted-foreground">{showingText}</p>
                        )}
                    </div>
                </div>

                {/* Main Card */}
                <Card className="shadow-sm">
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <CardTitle className="text-xl">Listado de Clientes</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleExportCsv}
                                    size="sm"
                                    disabled={processing}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Exportar CSV
                                </Button>
                                <Button
                                    onClick={handleNewCustomer}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                                    Nuevo Cliente
                                </Button>
                            </div>
                        </div>

                        <FiltersForm
                            data={data}
                            setData={setData}
                            onSubmit={submitFilters}
                            isLoading={processing}
                        />
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">Código</TableHead>
                                        <TableHead className="min-w-[200px]">Cliente</TableHead>
                                        <TableHead className="w-[160px]">Documento</TableHead>
                                        <TableHead className="w-[200px]">Contacto</TableHead>
                                        <TableHead className="w-[140px] text-center">Estado</TableHead>
                                        <TableHead className="w-[60px] text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!hasCustomers ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <UsersRoundIcon className="h-8 w-8" />
                                                    <p className="text-sm">No hay clientes que coincidan con los filtros actuales</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        page.data.map((customer) => (
                                            <TableRow key={customer.id} className="hover:bg-muted/50">
                                                <TableCell className="font-mono text-xs font-medium">
                                                    {customer.code}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-sm">{customer.name}</div>
                                                        <Badge variant="blue">
                                                            {CUSTOMER_KIND_LABELS[customer.kind]}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {customer.document_type !== 'NONE' && customer.document_number ? (
                                                        <div className="space-y-1">
                                                            <div className="font-mono text-xs font-medium">
                                                                {customer.document_number}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {DOCUMENT_TYPE_LABELS[customer.document_type]}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sin documento</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="truncate" title={customer.email || undefined}>
                                                            {customer.email || '—'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {customer.phone || '—'}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="space-y-1">
                                                        <div>
                                                            <Badge variant={customer.active ? 'green' : 'gray'}>
                                                                {customer.active ? 'Activo' : 'Inactivo'}
                                                            </Badge>
                                                        </div>
                                                        {customer.is_taxpayer && (
                                                            <div>
                                                                <Badge variant="yellow">Contribuyente</Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <CustomerRowActions
                                                        customer={customer}
                                                        onEdit={handleEditCustomer}
                                                        onDelete={handleDeleteCustomer}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasCustomers && <Pagination links={page.links} />}
                    </CardContent>
                </Card>
            </div>

            <CustomerFormDialog
                open={openForm}
                setOpen={setOpenForm}
                editing={editing as any}
            // onClose={handleFormClose}
            />
        </AppLayout>
    );
}