/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Download, Eye, X, Calendar, DollarSign, FileText, Printer } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";


// Wayfinder helpers
import SaleController from "@/actions/App/Http/Controllers/Sales/SaleController";
import SalePrintController from "@/actions/App/Http/Controllers/Sales/SalePrintController";
import SaleExportController from "@/actions/App/Http/Controllers/Sales/SaleExportController";

// Tipos para mejor type safety
interface Sale {
    id: string;
    number: string;
    occurred_at: string;
    ncf_type?: string;
    ncf_number?: string;
    bill_to_name: string;
    bill_to_doc_type?: string;
    bill_to_doc_number?: string;
    total: number;
    currency_code: string;
    status: 'completed' | 'void' | 'refunded';
}

interface Summary {
    count: number;
    subtotal: number;
    taxes: number;
    discounts: number;
    total: number;
}

interface Filters {
    q?: string;
    from?: string;
    to?: string;
    ncf_type?: string;
    status?: string;
}
type active_store = {
    id: number;
    name: string;
}

export default function SalesIndex() {
    const { sales, filters, summary, active_store } = usePage<{
        sales: { data: Sale[], links: any[] };
        filters: Filters;
        summary: Summary;
        active_store: active_store;
    }>().props;

    const [q, setQ] = useState<string>(filters?.q ?? "");
    const [from, setFrom] = useState<string>(filters?.from ?? "");
    const [to, setTo] = useState<string>(filters?.to ?? "");
    const [ncfType, setNcfType] = useState<string>(filters?.ncf_type ?? "");
    const [status, setStatus] = useState<string>(filters?.status ?? "");
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    const buildExportQuery = () => ({
        q: filters.q || undefined,
        from: filters?.from || undefined,
        to: filters?.to || undefined,
        ncf_type: filters?.ncf_type || undefined,
        status: filters?.status || undefined,
        store_id: active_store.id || undefined,
    });

    // Debounced search
    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

    const fmt = useCallback((n: number) => {
        return (n ?? 0).toLocaleString("es-DO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-DO", {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const getStatusBadge = useCallback((status: string) => {
        const variants: Record<string, { variant: any, label: string, className: string }> = {
            completed: { variant: "default", label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-200" },
            void: { variant: "destructive", label: "Anulada", className: "bg-red-100 text-red-800 hover:bg-red-200" },
            refunded: { variant: "secondary", label: "Devuelta", className: "bg-orange-100 text-orange-800 hover:bg-orange-200" }
        };

        const config = variants[status] || { variant: "outline", label: status, className: "" };
        return (
            <Badge className={`${config.className} border-0`}>
                {config.label}
            </Badge>
        );
    }, []);

    const apply = useCallback(() => {
        setLoading(true);
        const url = SaleController.index.url({
            query: {
                q: q || undefined,
                from: from || undefined,
                to: to || undefined,
                ncf_type: ncfType || undefined,
                status: status || undefined,
            },
        });

        router.visit(url, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false)
        });
    }, [q, from, to, ncfType, status]);

    const clearFilters = useCallback(() => {
        setQ("");
        setFrom("");
        setTo("");
        setNcfType("");
        setStatus("");

        const url = SaleController.index.url();
        router.visit(url, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    // Auto-apply search with debounce
    useEffect(() => {
        if (searchDebounce) {
            clearTimeout(searchDebounce);
        }

        const timeout = setTimeout(() => {
            if (q !== (filters?.q ?? "")) {
                apply();
            }
        }, 500);

        setSearchDebounce(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [q]);

    // Check if filters are active
    const hasActiveFilters = !!(q || from || to || ncfType || status);

    const rows: Sale[] = sales?.data ?? [];

    return (
        <AppLayout>
            <Head title="Ventas" />

            <div className="p-6 space-y-6 ">
                {/* Header */}
                <div className="flex flex-col sm:flex-row p-5 justify-between dark:from-slate-50  items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Ventas</h1>
                        <p className="text-gray-600 dark:text-slate-50">Gestión y seguimiento de todas las ventas</p>
                    </div>
                    <div className="flex gap-2 dark:bg-slate-900">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(SaleExportController.csv.url({ query: buildExportQuery() }), "_blank")}>
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(SaleExportController.xlsx.url({ query: buildExportQuery() }), "_blank")}>
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-50">Ventas</p>
                                    <p className="text-lg font-semibold">{summary?.count ?? 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-50">Subtotal</p>
                                    <p className="text-lg font-semibold">{fmt(Number(summary?.subtotal || 0))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-orange-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-50">Impuestos</p>
                                    <p className="text-lg font-semibold">{fmt(Number(summary?.taxes || 0))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-red-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-50">Descuentos</p>
                                    <p className="text-lg font-semibold">{fmt(Number(summary?.discounts || 0))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-purple-600" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-50">Total</p>
                                    <p className="text-lg font-semibold text-purple-600">{fmt(Number(summary?.total || 0))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            {/* Search Bar */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Buscar por número, NCF, cliente o documento..."
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}
                                >
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filtros
                                    {hasActiveFilters && <span className="ml-1 bg-blue-500 text-white rounded-full text-xs px-1.5 py-0.5">!</span>}
                                </Button>
                                {hasActiveFilters && (
                                    <Button variant="ghost" onClick={clearFilters}>
                                        <X className="h-4 w-4 mr-2" />
                                        Limpiar
                                    </Button>
                                )}
                            </div>

                            {/* Advanced Filters */}
                            {showFilters && (
                                <div className="border-t pt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Desde</label>
                                            <Input
                                                type="date"
                                                value={from ?? ""}
                                                onChange={(e) => setFrom(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Hasta</label>
                                            <Input
                                                type="date"
                                                value={to ?? ""}
                                                onChange={(e) => setTo(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Tipo NCF</label>
                                            <Select value={ncfType ?? ""} onValueChange={setNcfType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="B01">B01 - Crédito Fiscal</SelectItem>
                                                    <SelectItem value="B02">B02 - Consumidor Final</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Estado</label>
                                            <Select value={status ?? ""} onValueChange={setStatus}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar estado" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="completed">Completada</SelectItem>
                                                    <SelectItem value="void">Anulada</SelectItem>
                                                    <SelectItem value="refunded">Devuelta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button onClick={apply} disabled={loading}>
                                            {loading ? "Aplicando..." : "Aplicar Filtros"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b dark:bg-slate-900">
                                    <tr>
                                        <th className="text-left p-4 font-semibold text-gray-700  dark:text-slate-50">Fecha</th>
                                        <th className="text-left p-4 font-semibold text-gray-700  dark:text-slate-50">Número</th>
                                        <th className="text-left p-4 font-semibold text-gray-700  dark:text-slate-50">NCF</th>
                                        <th className="text-left p-4 font-semibold text-gray-700  dark:text-slate-50">Cliente</th>
                                        <th className="text-right p-4 font-semibold text-gray-700  dark:text-slate-50">Total</th>
                                        <th className="text-center p-4 font-semibold text-gray-700  dark:text-slate-50">Estado</th>
                                        <th className="text-center p-4 font-semibold text-gray-700  dark:text-slate-50">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-600">
                                            <td className="p-4">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span className="text-sm">{formatDate(sale.occurred_at)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-sm font-medium">{sale.number}</span>
                                            </td>
                                            <td className="p-4">
                                                {sale.ncf_type ? (
                                                    <div className="text-sm">
                                                        <span className="font-medium">{sale.ncf_type}</span>
                                                        {sale.ncf_number && (
                                                            <div className="font-mono text-xs text-gray-500">{sale.ncf_number}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <div className="font-medium text-sm">{sale.bill_to_name}</div>
                                                    {sale.bill_to_doc_number && (
                                                        <div className="text-xs text-gray-500">
                                                            {sale.bill_to_doc_type} {sale.bill_to_doc_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-semibold text-sm">
                                                    {fmt(sale.total)} {sale.currency_code}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {getStatusBadge(sale.status)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center">

                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => router.visit(SaleController.show.url({ sale: Number(sale.id) }))} className="cursor-pointer" title="ver detalles">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => window.open(
                                                            SalePrintController.print.url({ sale: Number(sale.id) }),
                                                            "_blank",
                                                            "noopener"
                                                        )} className="cursor-pointer" title="imprimir recibo">
                                                        <Printer className="w-4 h4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center">
                                                <div className="flex flex-col items-center space-y-2">
                                                    <FileText className="h-12 w-12 text-gray-300" />
                                                    <p className="text-gray-500 font-medium">No se encontraron ventas</p>
                                                    <p className="text-gray-400 text-sm">Intenta modificar los filtros de búsqueda</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {sales?.links && sales.links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {sales.links.map((link: any, i: number) => (
                            <Link
                                key={i}
                                href={link.url || "#"}
                                preserveScroll
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${link.active
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-white text-gray-700 hover:bg-gray-50 border"
                                    } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}