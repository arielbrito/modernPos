/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import dayjs from "dayjs";
import {
    Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
    ArrowLeft, Pencil, FileText, Printer, Download,
    Mail, Phone, MapPin, Building2, User2, Receipt, Wallet2, EllipsisVertical
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { CustomerFormDialog } from "./partials/customer-form-dialog";
import customers from "@/routes/customers";
import CustomerController from "@/actions/App/Http/Controllers/CRM/CustomerController";
import { money } from "@/utils/inventory";
import { CustomerPaymentModal } from "./partials/CustomerPaymentModal";

import { Register, Customer } from "@/types";
import SaleController from "@/actions/App/Http/Controllers/Sales/SaleController";

type BreadcrumbItem = { title: string; href: string };

// type Customer = {
//     id: number;
//     code: string;
//     name: string;
//     kind: "person" | "company";
//     document_type: "RNC" | "CED" | "NONE";
//     document_number: string | null;
//     email: string | null;
//     phone: string | null;
//     address: string | null;
//     is_taxpayer: boolean;
//     active: boolean;
//     allow_credit: boolean;
//     credit_limit: number;
//     credit_terms_days: number;
//     created_at?: string;
//     balance?: number;
// };
interface CustomerLite {
    id: number;
    name: string;
    balance: number;
}

type Invoice = {
    id: number;
    date: string;
    number: string;
    ncf?: string | null;
    status: string;
    items_count: number;
    total: number;
    paid: number;
    due: number;
};

type PageLink = { url: string | null; label: string; active: boolean };
type Paginated<T> = {
    data: T[];
    links: PageLink[];
    meta?: { current_page: number; last_page: number; total: number };
};

interface Props {
    customer: Customer;
    customerLite: CustomerLite;
    stats: { invoices_count: number; total_purchase: number; total_paid: number; balance: number };
    invoices: Paginated<Invoice>;
    registers: Register[];
}

export default function Show({ customer, stats, invoices, registers, customerLite }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Clientes", href: CustomerController.index.url() },
        { title: customer.name, href: customers.show.url({ customer: customer.id }) },
    ];

    const [openEdit, setOpenEdit] = React.useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

    const initials = React.useMemo(() => {
        const parts = (customer.name || "").split(" ").filter(Boolean);
        return (parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? "");
    }, [customer.name]);

    const copy = (txt?: string | null) => {
        if (!txt) return;
        navigator.clipboard.writeText(txt);
    };

    const exportStatement = () => {
        // Ajusta ruta cuando tengas estado de cuenta
        window.print();
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente: ${customer.name}`} />

            <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
                {/* Top bar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <Link href={customers.index.url()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={exportStatement}>
                            <FileText className="h-4 w-4 mr-2" /> Estado de cuenta
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="#">Nueva venta</Link>
                        </Button>
                        <Button onClick={() => setOpenEdit(true)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                    </div>
                </div>

                {/* Header cards */}
                <div className="grid gap-6 md:grid-cols-12">
                    {/* Perfil / KPIs */}
                    <Card className="md:col-span-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14">
                                        <AvatarFallback className="text-base">{initials.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-xl font-semibold">{customer.name}</h1>
                                            <Badge variant={customer.active ? "default" : "secondary"}>
                                                {customer.active ? "Activo" : "Inactivo"}
                                            </Badge>
                                            {customer.is_taxpayer && <Badge variant="outline">Contribuyente</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Desde {customer.created_at ? dayjs(customer.created_at).format("D MMM YYYY") : "—"} &nbsp;·&nbsp; Código <span className="font-mono">{customer.code}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 divide-x rounded-lg border bg-card">
                                    <Kpi title="Facturas" value={stats.invoices_count.toLocaleString()} icon={<Receipt className="h-4 w-4" />} />
                                    <Kpi title="Comprado" value={money(stats.total_purchase)} icon={<Download className="h-4 w-4" />} />
                                    <Kpi title="Pagado" value={money(stats.total_paid)} icon={<Wallet2 className="h-4 w-4" />} />
                                </div>
                            </div>

                            <Separator className="my-5" />

                            {/* Info rápida */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Tipo">
                                    {customer.kind === "company" ? "Empresa" : "Persona"}
                                </InfoRow>

                                <InfoRow icon={<User2 className="h-4 w-4" />} label="Documento">
                                    {customer.document_type !== "NONE" ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="font-mono">{customer.document_type} — {customer.document_number ?? "—"}</span>
                                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copy(customer.document_number)}>Copiar</Button>
                                        </span>
                                    ) : "No definido"}
                                </InfoRow>

                                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email">
                                    {customer.email ? <a href={`mailto:${customer.email}`} className="underline underline-offset-2">{customer.email}</a> : "—"}
                                </InfoRow>

                                <InfoRow icon={<Phone className="h-4 w-4" />} label="Teléfono">
                                    {customer.phone ? <a href={`tel:${customer.phone}`} className="underline underline-offset-2">{customer.phone}</a> : "—"}
                                </InfoRow>

                                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Dirección" className="md:col-span-2">
                                    {customer.address || "—"}
                                </InfoRow>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Balance / crédito */}
                    <Card className="md:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Resumen financiero</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><EllipsisVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Balance</span>
                                    <span className={`font-semibold ${stats.balance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{money(stats.balance)}</span>
                                </div>
                            </div>

                            <div className="rounded-lg border p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Límite de crédito</span>
                                    <span className="font-medium">{money(customer.credit_limit ?? 0)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Días de crédito</span>
                                    <span className="font-medium">{customer.credit_terms_days ?? 0}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button className="flex-1" variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
                                    <Wallet2 className="h-4 w-4 mr-2" /> Abono
                                </Button>
                                <Button className="flex-1" variant="default"><Receipt className="h-4 w-4 mr-2" /> Nueva factura</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Attachments + Invoices grid (adjuntos bien ubicados) */}
                <div className="grid gap-6 md:grid-cols-12">
                    {/* Adjuntos en columna izquierda */}
                    <Card className="md:col-span-4">
                        <CardHeader><CardTitle>Archivos adjuntos</CardTitle></CardHeader>
                        <CardContent>
                            {/* Conecta a tu endpoint cuando lo tengas */}
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No hay archivos. <br />
                                <Button variant="outline" size="sm" className="mt-3">Subir archivos</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Facturas */}
                    <Card className="md:col-span-8">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Facturas</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Exportar</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Número</TableHead>
                                            <TableHead>NCF</TableHead>
                                            <TableHead className="text-right">Ítems</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Pagado</TableHead>
                                            <TableHead className="text-right">Pendiente</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.data.length === 0 && (
                                            <TableRow><TableCell colSpan={8} className="h-20 text-center text-sm text-muted-foreground">Sin facturas para este cliente.</TableCell></TableRow>
                                        )}

                                        {invoices.data.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="whitespace-nowrap">{dayjs(inv.date).format("DD/MM/YYYY")}</TableCell>
                                                <TableCell className="font-mono">{inv.number}</TableCell>
                                                <TableCell className="font-mono text-xs">{inv.ncf ?? "—"}</TableCell>
                                                <TableCell className="text-right">{inv.items_count}</TableCell>
                                                <TableCell className="text-right">{money(inv.total)}</TableCell>
                                                <TableCell className="text-right">{money(inv.paid)}</TableCell>
                                                <TableCell className={`text-right font-medium ${inv.due > 0 ? 'text-destructive' : ''}`}>{money(inv.due)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" asChild>
                                                            <Link href={SaleController.show({ sale: inv.id })}>Ver</Link>
                                                        </Button>
                                                        {inv.due > 0 && <Button size="sm" variant="default" onClick={() => setIsPaymentModalOpen(true)}>Pagar</Button>}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* TODO: Pagination component si lo tienes */}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal editar (reutiliza tu dialog) */}
            <CustomerFormDialog open={openEdit} setOpen={setOpenEdit} editing={customer as any} />
            <CustomerPaymentModal
                customer={customer}
                registers={registers}
                isOpen={isPaymentModalOpen}
                setIsOpen={setIsPaymentModalOpen}
            />
        </AppLayout>
    );
}

/** Sub-componentes UI pequeños */
function Kpi({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="px-4 py-3 w-[160px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}{title}
            </div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );
}
function InfoRow({ icon, label, children, className }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <div className="text-xs text-muted-foreground flex items-center gap-2">{icon}{label}</div>
            <div className="mt-1 text-sm">{children}</div>
        </div>
    );
}
