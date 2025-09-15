/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { Head, router } from "@inertiajs/react";
import { toast } from "sonner";

// Layout & UI
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import {
    DollarSign,
    ArrowDownCircle,
    ArrowUpCircle,
    DoorOpen,
    DoorClosed,
    Printer,
    Edit3,
    TrendingUp,
    TrendingDown,
    Clock,
    User,
    Receipt,
    Search,
    Calendar,
    Wallet,
    Building,
    ArrowRight,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Calculator,
    Menu,
    Filter,
    Download,
    Eye,
    EyeOff,
    Moon,
    Sun
} from "lucide-react";

// Partials (modales)
import { CashMovementModal } from "./partials/cash-movement-modal";

// Rutas (Wayfinder)
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";
import CashShiftController from "@/actions/App/Http/Controllers/Cash/CashShiftController";
import CashShiftReportController from "@/actions/App/Http/Controllers/Cash/CashShiftReportController";

// Tipos
type Denomination = { id: number; value: number; kind: "bill" | "coin"; currency_code: string };

type PaymentsAggRow = {
    method: string
    currency_code: string
    count: number
    amount: number
    amount_in_sale_ccy: number
}
type Movement = {
    id: number;
    created_at: string;
    direction: "in" | "out";
    amount: number;
    reason?: string | null;
    reference?: string | null;
    user?: { id: number; name: string } | null;
    pay_method?: string | null;
    pay_currency?: string | null;
    sale_number?: string | null;
};

type ShiftSummary = {
    opening: number;
    income: number;
    expense: number;
    cash_in_hand: number;
    expense_visible: number;
    closing: number;

};

type Register = { id: number; name: string };
type Shift = {
    id: string;
    status: "open" | "closed";
    opened_at: string;
    closed_at?: string | null;
    opened_by?: { id: number; name: string } | null;
    currency_code: string;
};

interface Props {
    register: Register;
    shift: Shift | null;
    summary: ShiftSummary;
    incomes: Movement[];
    expenses: Movement[];
    denominations: Denomination[];
    currencies: string[];
    activeCurrency: string;
    can: {
        open: boolean;
        close: boolean;
        move: boolean;
    };
    flow: {
        payments_by_method: PaymentsAggRow[];
        cash_in_active_currency: number;
        non_cash_in_sale_ccy: number;
    };
    income_breakdown?: Record<string, number>;
    income_non_cash?: number;
}

// Hook personalizado para manejar el estado de búsqueda con debounce
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Hook para detectar tema
function useTheme() {
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        // Detectar tema inicial
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        checkTheme();

        // Observer para cambios en el tema
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    return isDark;
}

// Enhanced Stat Component con mejor responsividad y tema
function Stat({
    label,
    value,
    accent,
    icon: Icon,
    trend,
    onEdit,
    footer,
    loading = false
}: {
    label: string;
    value: string;
    accent?: "green" | "red" | "blue" | "amber" | "purple";
    icon?: React.ComponentType<{ className?: string }>;
    trend?: "up" | "down" | "neutral";
    onEdit?: () => void;
    loading?: boolean;
    footer?: React.ReactNode;  // 👈
}) {
    const colorMap = {
        green: "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        red: "from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
        blue: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        amber: "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        purple: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
    };

    const iconColorMap = {
        green: "text-emerald-600 dark:text-emerald-400",
        red: "text-rose-600 dark:text-rose-400",
        blue: "text-blue-600 dark:text-blue-400",
        amber: "text-amber-600 dark:text-amber-400",
        purple: "text-purple-600 dark:text-purple-400",
    };

    if (loading) {
        return (
            <Card className="relative overflow-hidden border-2 transition-all">
                <CardContent className="p-4 sm:p-6">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`relative overflow-hidden border-2 transition-all hover:shadow-md dark:hover:shadow-lg group ${accent ? colorMap[accent] : "from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700"
            }`}>
            <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${accent ? iconColorMap[accent] : "text-slate-600 dark:text-slate-400"}`} />}
                            <span className="truncate">{label}</span>
                        </div>
                        <div className="text-md sm:text-2xl font-bold tabular-nums break-all sm:break-normal">{value}</div>
                        {trend && (
                            <div className="flex items-center gap-1 text-xs">
                                {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />}
                                {trend === "down" && <TrendingDown className="h-3 w-3 text-red-600 flex-shrink-0" />}
                                <span className={`${trend === "up"
                                    ? "text-green-600 dark:text-green-400"
                                    : trend === "down"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-muted-foreground"
                                    } truncate`}>
                                    {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} vs anterior
                                </span>
                            </div>
                        )}
                    </div>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={onEdit}
                            title="Recontar apertura (arqueo parcial)"
                        >
                            <Edit3 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {footer && <div className="mt-3">{footer}</div>}
            </CardContent>

            {/* Decorative accent line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${accent
                ? `bg-gradient-to-r ${accent === "green" ? "from-emerald-400 to-emerald-600" :
                    accent === "red" ? "from-rose-400 to-rose-600" :
                        accent === "blue" ? "from-blue-400 to-blue-600" :
                            accent === "amber" ? "from-amber-400 to-amber-600" :
                                "from-purple-400 to-purple-600"
                }`
                : "bg-slate-300 dark:bg-slate-600"
                }`} />
        </Card>
    );
}

// Enhanced Movement Row Component
const MovementRow = React.memo(({ movement, currency }: { movement: Movement; currency: string }) => {
    const isIncome = movement.direction === "in";
    const [expanded, setExpanded] = React.useState(false);

    const methodClass =
        movement.pay_method === "cash"
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
            : movement.pay_method === "card"
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                : movement.pay_method
                    ? "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    : "";

    return (
        <TableRow className="hover:bg-muted/50 transition-colors group">
            <TableCell className="py-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full flex-shrink-0 ${isIncome
                        ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                        }`}>
                        {isIncome ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{new Date(movement.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 sm:hidden">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{new Date(movement.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{new Date(movement.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-4">
                <div className="space-y-2">
                    <div className="font-medium truncate pr-2">
                        {movement.reason ?? (isIncome ? "Ingreso" : "Salida")}
                    </div>

                    {/* Badges - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-1 sm:gap-2">
                        {movement.pay_method && (
                            <Badge variant="outline" className={`${methodClass} text-xs`}>
                                {movement.pay_method.toUpperCase()}
                            </Badge>
                        )}
                        {movement.sale_number && (
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                                {movement.sale_number}
                            </Badge>
                        )}
                    </div>

                    {/* Reference and User - Collapsible on mobile */}
                    <div className="space-y-1">
                        {movement.reference && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Receipt className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{movement.reference}</span>
                            </div>
                        )}
                        {movement.user && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{movement.user.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-4 text-right">
                <div className={`font-semibold text-lg tabular-nums transition-colors ${isIncome
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}>
                    {money(movement.amount, currency)}
                </div>
            </TableCell>
        </TableRow>
    );
});

MovementRow.displayName = 'MovementRow';

// Helper function for money formatting
const money = (n: number, c = "DOP") =>
    new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2
    }).format(Number(n || 0));

// Loading skeleton for tables
function TableSkeleton() {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function CashbookShow({
    register,
    shift,
    summary,
    incomes,
    expenses,
    denominations,
    can,
    currencies,
    activeCurrency,
    flow,
    income_breakdown,
    income_non_cash

}: Props) {
    const currency = activeCurrency;
    const isDark = useTheme();
    const totalVentasTurno =
        (flow?.cash_in_active_currency ?? 0) + (income_non_cash ?? 0);

    // Estados locales
    const [searchIncome, setSearchIncome] = React.useState("");
    const [searchExpense, setSearchExpense] = React.useState("");
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [showMobileActions, setShowMobileActions] = React.useState(false);

    // Estados de modales
    const [openCashIn, setOpenCashIn] = React.useState(false);
    const [openCashOut, setOpenCashOut] = React.useState(false);

    // Debounce para búsquedas
    const debouncedSearchIncome = useDebounce(searchIncome, 300);
    const debouncedSearchExpense = useDebounce(searchExpense, 300);

    const breakdown = income_breakdown ?? {};

    // Efectos para búsqueda con debounce
    React.useEffect(() => {
        if (debouncedSearchIncome !== searchIncome) return;

        router.get(RegisterController.cashbook.url({ register: register.id }),
            { q_in: debouncedSearchIncome },
            { preserveState: true, replace: true, only: ["incomes"] }
        );
    }, [debouncedSearchIncome, register.id]);

    React.useEffect(() => {
        if (debouncedSearchExpense !== searchExpense) return;

        router.get(RegisterController.cashbook.url({ register: register.id }),
            { q_out: debouncedSearchExpense },
            { preserveState: true, replace: true, only: ["expenses"] }
        );
    }, [debouncedSearchExpense, register.id]);

    const refresh = React.useCallback(async () => {
        setIsRefreshing(true);
        router.reload({
            only: ["shift", "summary", "incomes", "expenses"],
            onFinish: () => setIsRefreshing(false)
        });
    }, []);

    const handleCurrencyChange = React.useCallback((newCurrency: string) => {
        router.get(
            RegisterController.cashbook.url({ register: register.id }),
            { ccy: newCurrency },
            {
                preserveState: true,
                replace: true,
                only: ["shift", "summary", "incomes", "expenses", "denominations", "activeCurrency"]
            }
        );
    }, [register.id]);

    const getShiftStatusBadge = React.useMemo(() => {
        if (!shift) {
            return (
                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                    <XCircle className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Sin turno</span>
                    <span className="sm:hidden">—</span>
                </Badge>
            );
        }

        return shift.status === "open" ? (
            <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Turno abierto</span>
                <span className="sm:hidden">Abierto</span>
            </Badge>
        ) : (
            <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Turno cerrado</span>
                <span className="sm:hidden">Cerrado</span>
            </Badge>
        );
    }, [shift]);

    // Memorizar componentes costosos
    const memoizedIncomeRows = React.useMemo(() =>
        incomes.map(m => <MovementRow key={m.id} movement={m} currency={currency} />),
        [incomes, currency]
    );

    const memoizedExpenseRows = React.useMemo(() =>
        expenses.map(m => <MovementRow key={m.id} movement={m} currency={currency} />),
        [expenses, currency]
    );


    return (
        <AppLayout breadcrumbs={[
            { title: "Cajas", href: RegisterController.index.url() },
            { title: register.name, href: "#" }
        ]}>
            <Head title={`Cashbook – ${register.name}`} />

            <div className="mx-auto max-w-7xl p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Enhanced Header - Totalmente responsivo */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-900 text-white">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-white/5"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.15) 1px, transparent 1px)',
                                backgroundSize: '40px 40px'
                            }}
                        />
                    </div>

                    <div className="relative p-4 sm:p-6 lg:p-8">
                        <div className="space-y-4 lg:space-y-6">
                            {/* Header Top */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                                            <Building className="h-6 w-6 sm:h-8 sm:w-8" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-2xl sm:text-3xl font-bold">Cashbook</h1>
                                            <div className="flex items-center gap-2 text-blue-100">
                                                <Wallet className="h-4 w-4 flex-shrink-0" />
                                                <span className="text-lg sm:text-xl truncate">{register.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status badges - Stack on very small screens */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                        {getShiftStatusBadge}
                                        {shift && (
                                            <>
                                                <div className="hidden sm:flex items-center gap-2 text-sm text-blue-100">
                                                    <User className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">Abierto por {shift.opened_by?.name ?? "—"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-blue-100">
                                                    <Clock className="h-4 w-4 flex-shrink-0" />
                                                    <span className="hidden sm:inline">{new Date(shift.opened_at).toLocaleString()}</span>
                                                    <span className="sm:hidden">{new Date(shift.opened_at).toLocaleTimeString()}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile action toggle */}
                                <div className="sm:hidden">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        onClick={() => setShowMobileActions(!showMobileActions)}
                                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                    >
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Actions - Responsive layout */}
                            <div className={`${showMobileActions ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 sm:gap-3`}>
                                {/* Currency Selector */}
                                <Select value={currency} onValueChange={handleCurrencyChange}>
                                    <SelectTrigger className="w-full sm:w-[140px] bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder="Moneda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={refresh}
                                    disabled={isRefreshing}
                                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                </Button>

                                {/* Conditional action buttons */}
                                {!shift && can.open && (
                                    <Button
                                        className="gap-2 bg-white text-blue-700 hover:bg-white/90 justify-center"
                                        onClick={() =>
                                            router.visit(RegisterController.openShiftForm.url({ register: register.id }))
                                        }
                                    >
                                        <DoorOpen className="h-4 w-4" />
                                        <span className="hidden sm:inline">Abrir turno</span>
                                        <span className="sm:hidden">Abrir</span>
                                    </Button>
                                )}

                                {shift && shift.status === "open" && can.move && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            className="gap-2 bg-green-100 text-green-700 hover:bg-green-200 border-green-200 justify-center"
                                            onClick={() => setOpenCashIn(true)}
                                        >
                                            <ArrowDownCircle className="h-4 w-4" />
                                            <span className="hidden sm:inline">Ingreso</span>
                                            <span className="sm:hidden">+</span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="gap-2 bg-red-100 text-red-700 hover:bg-red-200 border-red-200 justify-center"
                                            onClick={() => setOpenCashOut(true)}
                                        >
                                            <ArrowUpCircle className="h-4 w-4" />
                                            <span className="hidden sm:inline">Salida</span>
                                            <span className="sm:hidden">-</span>
                                        </Button>
                                    </>
                                )}

                                {shift && shift.status === "open" && can.close && (
                                    <Button
                                        className="gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 justify-center"
                                        onClick={() => router.visit(RegisterController.closeShiftForm.url({ shift: Number(shift.id) }))}
                                    >
                                        <DoorClosed className="h-4 w-4" />
                                        <span className="hidden sm:inline">Cerrar turno</span>
                                        <span className="sm:hidden">Cerrar</span>
                                    </Button>
                                )}

                                <Button
                                    variant="secondary"
                                    className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 justify-center"
                                    asChild
                                >
                                    <a href={CashShiftReportController.show.url({ shift: Number(shift?.id) })}>
                                        <Printer className="h-4 w-4" />
                                        <span className="hidden sm:inline">Ver reporte</span>
                                        <span className="sm:hidden">Reporte</span>
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Stats Grid - Totalmente responsivo */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-5">
                    <Stat
                        label="Saldo inicial"
                        value={money(summary.opening, currency)}
                        accent="blue"
                        icon={Wallet}
                        loading={isRefreshing}
                        onEdit={shift?.status === "open" ? () => setOpenCashIn(true) : undefined}
                    />
                    <Stat
                        label="Ingresos del turno"
                        value={money(summary.income, currency)}
                        accent="green"
                        icon={TrendingUp}
                        trend="up"

                        loading={isRefreshing}
                    />
                    <Stat
                        label="Ventas (métodos)"
                        value={money(totalVentasTurno, currency)}
                        accent="purple"
                        icon={Receipt}
                    />

                    <Stat
                        label="Egresos del turno"
                        value={money(summary.expense_visible, currency)}
                        accent="red"
                        icon={TrendingDown}
                        trend="down"
                        loading={isRefreshing}
                    />
                    {/* <Stat
                        label="Efectivo en mano"
                        value={money(summary.cash_in_hand, currency)}
                        accent="purple"
                        icon={DollarSign}
                        loading={isRefreshing}
                    /> */}
                    <Stat
                        label="Cierre estimado"
                        value={money(summary.closing, currency)}
                        accent="amber"
                        icon={Calculator}
                        loading={isRefreshing}
                    />
                </div>

                {/* Payment Methods Summary - Nuevo componente responsivo */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <Calculator className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <span className="text-base sm:text-lg">Resumen por Método de Pago</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Efectivo ({currency})
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-green-700 dark:text-green-300 tabular-nums">
                                    {money(flow.cash_in_active_currency, currency)}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-indigo-100 dark:bg-indigo-900 rounded">
                                        <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                                        Tarjeta/Otros ({shift?.currency_code ?? "DOP"})
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                                    {money(flow.non_cash_in_sale_ccy, shift?.currency_code ?? "DOP")}
                                </span>
                            </div>

                            {flow.payments_by_method.length > 0 && (
                                <div className="pt-2 space-y-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground">Detalle por método:</h4>
                                    <ScrollArea className="max-h-32">
                                        {flow.payments_by_method.map((method, index) => (
                                            <div key={index} className="flex justify-between items-center py-1 text-xs">
                                                <span className="capitalize text-muted-foreground">
                                                    {method.method} ({method.currency_code}) - {method.count}x
                                                </span>
                                                <span className="font-mono font-medium">
                                                    {money(Number(method.amount), method.currency_code)}
                                                </span>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions Card */}
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <span className="text-base sm:text-lg">Acciones Rápidas</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {shift && shift.status === "open" && (
                                <>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 bg-white/70 dark:bg-slate-800/70"
                                        onClick={() => setOpenCashIn(true)}
                                        disabled={!can.move}
                                    >
                                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                        Registrar Ingreso
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 bg-white/70 dark:bg-slate-800/70"
                                        onClick={() => setOpenCashOut(true)}
                                        disabled={!can.move}
                                    >
                                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                        Registrar Salida
                                    </Button>

                                    <Separator />

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3 bg-white/70 dark:bg-slate-800/70"
                                        onClick={() => router.visit(RegisterController.closeShiftForm.url({ shift: Number(shift.id) }))}
                                        disabled={!can.close}
                                    >
                                        <DoorClosed className="h-4 w-4 text-amber-600" />
                                        Cerrar Turno
                                    </Button>
                                </>
                            )}

                            {!shift && (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 bg-white/70 dark:bg-slate-800/70"
                                    onClick={() => router.visit(RegisterController.openShiftForm.url({ register: register.id }))}
                                    disabled={!can.open}
                                >
                                    <DoorOpen className="h-4 w-4 text-blue-600" />
                                    Abrir Nuevo Turno
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 bg-white/70 dark:bg-slate-800/70"
                                asChild
                            >
                                <a href={CashShiftReportController.show.url({ shift: Number(shift?.id) })}>
                                    <Download className="h-4 w-4 text-indigo-600" />
                                    Descargar Reporte
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Enhanced Tables - Completamente responsivas */}
                <div className="grid gap-6 lg:gap-8 xl:grid-cols-2">
                    {/* Income Table */}
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                        <CardHeader className="pb-4 border-b border-green-100 dark:border-green-800">
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                                <CardTitle className="flex items-center gap-3 text-green-800 dark:text-green-200">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="text-base sm:text-lg">Crédito / Ingresos</span>
                                </CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar ingresos..."
                                        className="pl-10 w-full sm:w-[240px] bg-white/70 dark:bg-slate-900/70"
                                        value={searchIncome}
                                        onChange={(e) => setSearchIncome(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-hidden">
                                <ScrollArea className="h-[400px] sm:h-[500px]">
                                    {isRefreshing ? (
                                        <div className="p-4">
                                            <TableSkeleton />
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-green-50 dark:bg-green-950/80 backdrop-blur-sm">
                                                <TableRow className="border-green-100 dark:border-green-800">
                                                    <TableHead className="w-[120px] sm:w-[140px] text-green-700 dark:text-green-300">
                                                        <span className="hidden sm:inline">Fecha/Hora</span>
                                                        <span className="sm:hidden">Fecha</span>
                                                    </TableHead>
                                                    <TableHead className="text-green-700 dark:text-green-300">Detalles</TableHead>
                                                    <TableHead className="text-right text-green-700 dark:text-green-300 w-[100px] sm:w-[120px]">
                                                        Monto
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {incomes.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <TrendingUp className="h-12 w-12 text-muted-foreground/30" />
                                                                <span className="text-sm">No hay ingresos registrados</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    memoizedIncomeRows
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </ScrollArea>
                            </div>
                            <div className="border-t border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50 px-4 sm:px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Total de ingresos:
                                    </span>
                                    <span className="text-xl font-bold text-green-800 dark:text-green-200 tabular-nums">
                                        {money(summary.income, currency)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Expense Table */}
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                        <CardHeader className="pb-4 border-b border-red-100 dark:border-red-800">
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                                <CardTitle className="flex items-center gap-3 text-red-800 dark:text-red-200">
                                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <span className="text-base sm:text-lg">Débito / Egresos</span>
                                </CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar egresos..."
                                        className="pl-10 w-full sm:w-[240px] bg-white/70 dark:bg-slate-900/70"
                                        value={searchExpense}
                                        onChange={(e) => setSearchExpense(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-hidden">
                                <ScrollArea className="h-[400px] sm:h-[500px]">
                                    {isRefreshing ? (
                                        <div className="p-4">
                                            <TableSkeleton />
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-red-50 dark:bg-red-950/80 backdrop-blur-sm">
                                                <TableRow className="border-red-100 dark:border-red-800">
                                                    <TableHead className="w-[120px] sm:w-[140px] text-red-700 dark:text-red-300">
                                                        <span className="hidden sm:inline">Fecha/Hora</span>
                                                        <span className="sm:hidden">Fecha</span>
                                                    </TableHead>
                                                    <TableHead className="text-red-700 dark:text-red-300">Detalles</TableHead>
                                                    <TableHead className="text-right text-red-700 dark:text-red-300 w-[100px] sm:w-[120px]">
                                                        Monto
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expenses.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <TrendingDown className="h-12 w-12 text-muted-foreground/30" />
                                                                <span className="text-sm">No hay egresos registrados</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    memoizedExpenseRows
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </ScrollArea>
                            </div>
                            <div className="border-t border-red-100 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50 px-4 sm:px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                        Total de egresos:
                                    </span>
                                    <span className="text-xl font-bold text-red-800 dark:text-red-200 tabular-nums">
                                        {money(summary.expense_visible ?? summary.expense, currency)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modales */}
                {shift && (
                    <>
                        <CashMovementModal
                            open={openCashIn}
                            setOpen={setOpenCashIn}
                            shiftId={shift.id}
                            currency={currency}
                            direction="in"
                            onSuccess={() => {
                                toast.success("Ingreso registrado");
                                refresh();
                            }}
                        />

                        <CashMovementModal
                            open={openCashOut}
                            setOpen={setOpenCashOut}
                            shiftId={shift.id}
                            currency={currency}
                            direction="out"
                            onSuccess={() => {
                                toast.success("Salida registrada");
                                refresh();
                            }}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    );
}