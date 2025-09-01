
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PencilLine, Trash2, UserSquare2, FileText } from "lucide-react";
import { SupplierForm, type Supplier } from "./partials/supplier-form";
import { DeleteSupplierDialog } from "./partials/delete-supplier-dialog";
import { money } from "@/utils/inventory";
import { cn } from "@/lib/utils";
import { BreadcrumbItem } from "@/types";
import suppliers from "@/routes/inventory/suppliers";
import purchases from "@/routes/inventory/purchases";

// --- TIPOS MEJORADOS ---
// Se añaden las propiedades que faltaban para evitar el uso de `any`.
type OpenPurchase = {
    id: number;
    code: string;
    invoice_number?: string | null;
    invoice_date?: string | null;
    grand_total: number;
    paid_total: number;
    balance_total: number;
    days: number;
    bucket: '0-30' | '31-60' | '61-90' | '90+';
};

type AgingData = { '0_30': number; '31_60': number; '61_90': number; '90_plus': number; total: number };

interface Props {
    supplier: Supplier & { purchases_count?: number };
    openPurchases?: OpenPurchase[];
    account?: { total_open: number; grand_total: number; paid_total: number; count: number };
    aging?: AgingData;
}

// --- SUB-COMPONENTES PARA MAYOR CLARIDAD ---

// Tarjeta de estadística reutilizable
const StatCard = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className={cn("rounded-lg border bg-card p-4 text-card-foreground shadow-sm", className)}>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
    </div>
);

// Barra de progreso visual para el Aging Report
const AgingBar = ({ aging }: { aging: AgingData }) => {
    const segments = [
        { value: aging['0_30'], color: "bg-green-500", label: "0-30 Días" },
        { value: aging['31_60'], color: "bg-yellow-500", label: "31-60 Días" },
        { value: aging['61_90'], color: "bg-orange-500", label: "61-90 Días" },
        { value: aging['90_plus'], color: "bg-red-500", label: "90+ Días" },
    ];

    return (
        <div className="w-full">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {segments.map((seg, i) => (
                    seg.value > 0 && (
                        <div
                            key={i}
                            className={`transition-all ${seg.color}`}
                            style={{ width: `${(seg.value / aging.total) * 100}%` }}
                            title={`${seg.label}: ${money(seg.value)}`}
                        />
                    )
                ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center">
                        <span className={`mr-2 h-2 w-2 rounded-full ${seg.color}`} />
                        <span className="text-muted-foreground">{seg.label}:</span>
                        <span className="ml-auto font-semibold">{money(seg.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export default function SupplierShow({ supplier, openPurchases = [], account, aging }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Proveedores", href: suppliers.index.url() },
        { title: supplier.name, href: suppliers.show.url({ supplier: Number(supplier.id) }) },
    ];

    const [openForm, setOpenForm] = React.useState(false);
    const [openDelete, setOpenDelete] = React.useState(false);

    // ✅ Memoizamos la lista ordenada para optimizar el rendimiento.
    const sortedPurchases = React.useMemo(() => {
        return [...openPurchases].sort((a, b) => b.days - a.days);
    }, [openPurchases]);

    const hasOpenBalance = account && account.total_open > 0;


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Proveedor ${supplier.name}`} />
            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href={suppliers.index.url()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Proveedores
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Principal (70%) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UserSquare2 className="h-6 w-6 text-muted-foreground" />
                                    <CardTitle className="text-2xl">{supplier.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpenForm(true)}><PencilLine className="h-4 w-4" /> Editar</Button>
                                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => setOpenDelete(true)}><Trash2 className="h-4 w-4" /> Eliminar</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                    <div><div className="text-muted-foreground">RNC</div><div className="font-medium">{supplier.rnc || "—"}</div></div>
                                    <div><div className="text-muted-foreground">Contacto</div><div className="font-medium">{supplier.contact_person || "—"}</div></div>
                                    <div><div className="text-muted-foreground">Teléfono</div><div className="font-medium">{supplier.phone || "—"}</div></div>
                                    <div><div className="text-muted-foreground">Email</div><div className="font-medium">{supplier.email || "—"}</div></div>
                                    <div className="sm:col-span-2"><div className="text-muted-foreground">Dirección</div><div className="font-medium">{supplier.address || "—"}</div></div>
                                    <div className="sm:col-span-2"><div className="text-muted-foreground">Notas</div><div className="font-medium whitespace-pre-wrap">{supplier.notes || "—"}</div></div>
                                </div>
                            </CardContent>
                        </Card>

                        {hasOpenBalance ? (
                            <Card>
                                <CardHeader><CardTitle>Facturas con Balance Pendiente</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Código</TableHead>
                                                <TableHead>Factura</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="text-right">Acción</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedPurchases.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium"><Link className="underline-offset-2 hover:underline" href={purchases.show.url({ purchase: p.id })}>{p.code}</Link></TableCell>
                                                    <TableCell>{p.invoice_number ?? "—"}</TableCell>
                                                    <TableCell>{p.invoice_date ? new Date(p.invoice_date).toLocaleDateString() : "—"}</TableCell>
                                                    <TableCell className="text-right font-semibold">{money(p.balance_total)}</TableCell>
                                                    <TableCell className="text-right"><Link href={purchases.show.url({ purchase: p.id })}><Button size="sm" variant="outline">Ver</Button></Link></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="flex flex-col items-center justify-center p-10 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Este proveedor no tiene facturas con balance pendiente.</p>
                            </Card>
                        )}
                    </div>

                    {/* Columna Lateral (30%) */}
                    <div className="flex flex-col gap-6">
                        {hasOpenBalance && account && (
                            <StatCard label="Balance Total Pendiente" value={money(account.total_open)} className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800" />
                        )}
                        <Card>
                            <CardHeader><CardTitle>Resumen Histórico</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total de compras</span>
                                    <span className="font-semibold">{account?.count ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Monto total comprado</span>
                                    <span className="font-semibold">{money(account?.grand_total ?? 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Monto total pagado</span>
                                    <span className="font-semibold">{money(account?.paid_total ?? 0)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {aging && aging.total > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Antigüedad de Saldos (Aging)</CardTitle></CardHeader>
                                <CardContent>
                                    <AgingBar aging={aging} />
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Modales */}
                <SupplierForm open={openForm} onOpenChange={setOpenForm} supplier={supplier} />
                <DeleteSupplierDialog open={openDelete} onOpenChange={setOpenDelete} supplierId={supplier.id!} />
            </div>
        </AppLayout>
    );
}
