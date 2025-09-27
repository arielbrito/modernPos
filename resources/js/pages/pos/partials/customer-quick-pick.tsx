/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { cn } from "@/lib/utils";
import {
    ChevronsUpDown, Loader2, Search, User, X, BadgePercent,
    ShieldCheck, ShieldAlert, AlertTriangle
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Wayfinder routes
import CustomerController from "@/actions/App/Http/Controllers/CRM/CustomerController";
import DgiiLookupController from "@/actions/App/Http/Controllers/CRM/DgiiLookupController";
import NcfApiController from "@/actions/App/Http/Controllers/Fiscal/NcfApiController";
import { Customer } from "@/types";

// =================================================================
// TYPES
// =================================================================
// export type CustomerLite = {
//     allow_credit?: boolean;
//     id: number;
//     padron_id?: number;
//     source: "customer" | "padron";
//     name: string;
//     document_type: "RNC" | "CED" | "NONE";
//     document_number?: string | null;
//     is_taxpayer?: boolean | number | string | null;
//     is_generic?: boolean | null;
//     status?: string | null;
//     email?: string | null;
//     phone?: string | null;
//     address?: string | null;
// };

export type DgiiInfo = {
    found: boolean;
    is_taxpayer?: boolean | number | string;
    status?: string | null;
    doc_type?: "RNC" | "CED";
    doc_number?: string;
    name?: string;
};

export type CustomerQuickPickProps = {
    activeStoreId: number | null | undefined;
    value: Customer | null;
    onChange: (c: Customer | null) => void;
    onNcfChange?: (type: "B01" | "B02", preview: string | null) => void;
    className?: string;
    disabled?: boolean;
    allowGeneric?: boolean;
};

// =================================================================
// CONSTANTS & UTILS
// =================================================================
const AXIOS_OPTS = {
    withCredentials: true,
    headers: { "X-Requested-With": "XMLHttpRequest" },
    timeout: 8000,
} as const;

const SEARCH_SHORT_MS = 12_000;  // primer intento
const SEARCH_LONG_MS = 45_000;  // reintento extendido

const onlyDigits = (s: string): string => (s || "").replace(/\D+/g, "");

const formatDocumentNumber = (docNumber: string | null | undefined, docType: "RNC" | "CED" | "NONE"): string => {
    if (!docNumber || docType === "NONE") return "";
    const digits = onlyDigits(docNumber);
    if (docType === "CED" && digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    }
    return digits;
};

async function axiosGetWithRetry<T>(
    url: string,
    opts: any,
    retries = 1,
    backoffMs = 500
): Promise<{ data: T }> {
    try {
        return await axios.get<T>(url, opts);
    } catch (err: any) {
        const isTimeout = err?.code === "ECONNABORTED";
        const wasCanceled = axios.isCancel(err) || err?.code === "ERR_CANCELED";
        if (retries > 0 && (isTimeout || !err?.response) && !wasCanceled) {
            // espera breve y reintenta con timeout mayor
            await new Promise(r => setTimeout(r, backoffMs));
            return axiosGetWithRetry<T>(url, { ...opts, timeout: (opts?.timeout ?? AXIOS_OPTS.timeout) * 2 }, retries - 1, backoffMs * 2);
        }
        throw err;
    }
}


// =================================================================
// HOOKS (DGII / NCF iguales a los que ya usas)
// =================================================================
const useDgiiStatus = (customer: Customer | null) => {
    const [dgii, setDgii] = useState<DgiiInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDgiiStatus = useCallback(async (cust: Customer) => {
        const { document_type: docType, document_number: docNumber } = cust;
        if (!docType || docType === "NONE" || !docNumber) {
            setDgii(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const url = DgiiLookupController.find.url({ query: { doc_type: docType, doc_number: onlyDigits(docNumber) } });
            const response = await axios.get<DgiiInfo>(url, { ...AXIOS_OPTS, timeout: 15000 });
            setDgii(response.data);
        } catch (err) {
            setError("Error al consultar DGII");
            setDgii(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!customer || customer.is_generic) {
            setDgii(null);
            setError(null);
            return;
        }
        fetchDgiiStatus(customer);
    }, [customer?.id, fetchDgiiStatus]);

    const refetch = useCallback(() => {
        if (customer) fetchDgiiStatus(customer);
    }, [customer, fetchDgiiStatus]);

    return { dgii, loading, error, refetch };
};

const useNcfInfo = (
    customer: Customer | null,
    activeStoreId: number | null | undefined,
    onNcfChange?: (type: "B01" | "B02", preview: string | null) => void
) => {
    const [ncfType, setNcfType] = useState<"B01" | "B02">("B02");
    const [ncfPreview, setNcfPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateNcfPreview = useCallback(
        async (type: "B01" | "B02") => {
            if (!activeStoreId) {
                setNcfType("B02");
                setNcfPreview(null);
                return;
            }
            setLoading(true);
            setError(null);
            setNcfType(type);
            try {
                const url = NcfApiController.preview.url({
                    query: { store_id: activeStoreId, customer_id: customer?.id, type }
                });
                const response = await axios.get<{ ncf?: string }>(url, { ...AXIOS_OPTS, timeout: 15000 });
                setNcfPreview(response.data.ncf ?? "N/A");
            } catch {
                setError("Error NCF");
                setNcfPreview(null);
            } finally {
                setLoading(false);
            }
        },
        [activeStoreId, customer?.id]
    );

    useEffect(() => {
        if (!customer) {
            setNcfType("B02");
            setNcfPreview(null);
            return;
        }
        const defaultType = customer.is_taxpayer ? "B01" : "B02";
        updateNcfPreview(defaultType);
    }, [customer?.id, customer?.is_taxpayer]);

    useEffect(() => {
        onNcfChange?.(ncfType, ncfPreview);
    }, [ncfType, ncfPreview, onNcfChange]);

    return { ncfType, ncfPreview, updateNcfPreview, loading, error };
};

// =================================================================
// COMPONENTE
// =================================================================
export default function CustomerQuickPick({
    activeStoreId,
    value,
    onChange,
    onNcfChange,
    className,
    disabled = false,
    allowGeneric = true,
}: CustomerQuickPickProps) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const { dgii, loading: dgiiLoading, error: dgiiError } = useDgiiStatus(value);
    const { ncfType, ncfPreview, updateNcfPreview, loading: ncfLoading } = useNcfInfo(value, activeStoreId, onNcfChange);

    // AbortController para cancelar búsquedas en curso
    const searchControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!open) {
            setTerm("");
            setResults([]);
            setLoading(false);
            // cancela búsqueda si se cierra
            searchControllerRef.current?.abort();
            searchControllerRef.current = null;
        }
    }, [open]);

    const controllerRef = React.useRef<AbortController | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (term.trim().length < 2) {
            toast.warning("Ingresa al menos 2 caracteres para buscar.");
            return;
        }

        // cancela la búsqueda previa si existe
        if (controllerRef.current) controllerRef.current.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setLoading(true);
        setResults([]);
        try {
            const url = CustomerController.quickSearch.url({
                query: { term: term.trim(), limit: 12 }, // limita resultados
            });

            // primer intento (rápido)
            const { data } = await axiosGetWithRetry<any[]>(url, { ...AXIOS_OPTS, signal: controller.signal }, 1);

            setResults(Array.isArray(data) ? data : []);
            if (!data || data.length === 0) {
                toast.info("No se encontraron resultados.");
            }
        } catch (error: any) {
            if (axios.isCancel(error) || error?.code === "ERR_CANCELED") return;
            console.error("Error al buscar cliente:", error);
            toast.error("Ocurrió un error al realizar la búsqueda.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCustomer = (customer: Customer) => {
        onChange(customer);
        setOpen(false);
    };

    const clearSelection = () => {
        onChange(null);
    };

    const canUseB01 = useMemo(() => {
        if (!value || value.is_generic || value.document_type !== "RNC") return false;
        const isTaxpayer = dgii?.is_taxpayer === true || dgii?.is_taxpayer === 1 || dgii?.is_taxpayer === "1";
        const isActive = !dgii?.status || dgii?.status === "ACTIVO";
        return dgii?.found && isTaxpayer && isActive;
    }, [value, dgii]);

    const toggleB01 = useCallback((isChecked: boolean) => {
        if (disabled || ncfLoading) return;
        if (isChecked && !canUseB01) {
            toast.warning("El cliente no es contribuyente activo para usar Crédito Fiscal (B01).");
            return;
        }
        const nextType = isChecked ? "B01" : "B02";
        updateNcfPreview(nextType);
    }, [disabled, ncfLoading, canUseB01, updateNcfPreview]);

    const renderDgiiBadge = () => {
        if (!value || value.is_generic) return <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3" /> Genérico</Badge>;
        if (dgiiLoading) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</Badge>;
        if (dgiiError) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Error DGII</Badge>;
        if (!dgii?.found) return <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> No encontrado</Badge>;
        if (dgii.status !== "ACTIVO") return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" /> {dgii.status}</Badge>;
        return <Badge className="gap-1"><ShieldCheck className="w-3 h-3" /> DGII OK</Badge>;
    };

    const renderNcfBadge = () => (
        <Badge variant="outline" className="gap-1">
            {ncfLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <BadgePercent className="w-3 h-3" />
            {ncfType}
            {ncfPreview && <span className="text-muted-foreground"> · {ncfPreview}</span>}
        </Badge>
    );

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <Button
                variant="outline"
                role="combobox"
                className="w-[360px] justify-between"
                onClick={() => !disabled && setOpen(true)}
                disabled={disabled}
            >
                <div className="flex items-center gap-2 truncate">
                    <User className="w-4 h-4" />
                    <span className="truncate">{value ? value.name : "Consumidor Final"}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            <div className="hidden md:flex items-center gap-2 text-sm">
                {value && value.document_type !== "NONE" && (
                    <span className="text-muted-foreground text-xs">
                        {value.document_type} {formatDocumentNumber(value.document_number, value.document_type)}
                    </span>
                )}
                {renderDgiiBadge()}
            </div>

            <div className="flex items-center gap-2">
                {renderNcfBadge()}
                <div className="flex items-center gap-2">
                    <Switch
                        checked={ncfType === "B01"}
                        onCheckedChange={toggleB01}
                        disabled={!canUseB01 || disabled || ncfLoading}
                    />
                    <span className={cn("text-xs", (!canUseB01 || disabled) && "text-muted-foreground")}>
                        Crédito fiscal (B01)
                    </span>
                </div>
                {value && (
                    <Button variant="ghost" size="icon" onClick={clearSelection} disabled={disabled} aria-label="Quitar cliente">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Seleccionar cliente</DialogTitle>
                        <DialogDescription>
                            Busca por nombre, RNC o cédula.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <Input
                            placeholder="Escribe para buscar..."
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            className="flex-grow"
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="sr-only">Buscar</span>
                        </Button>
                    </form>

                    <div className="mt-4 max-h-[50vh] overflow-y-auto pr-2">
                        {loading && (
                            <div className="flex justify-center items-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && results.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                                Ingresa un término y presiona buscar.
                            </p>
                        )}
                        <div className="space-y-2">
                            {results.map((customer) => (
                                <div
                                    key={`${customer.source}-${customer.id}`}
                                    onClick={() => handleSelectCustomer(customer)}
                                    className="p-3 border rounded-md hover:bg-accent cursor-pointer"
                                >
                                    <p className="font-semibold">{customer.name}</p>
                                    {customer.document_number && (
                                        <p className="text-sm text-muted-foreground">
                                            {customer.document_type}: {formatDocumentNumber(customer.document_number, customer.document_type)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4 flex items-center justify-between gap-2">
                        {allowGeneric && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    clearSelection();
                                    setOpen(false);
                                }}
                            >
                                Consumidor Final
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // permite cancelar búsqueda lenta manualmente
                                searchControllerRef.current?.abort();
                                setOpen(false);
                            }}
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
