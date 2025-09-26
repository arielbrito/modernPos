import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

// --- LAYOUT, COMPONENTS & ICONS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
    Package,
    ShoppingCart,
    TrendingUp,
    Receipt,
    AlertTriangle,
    ArrowUpRight,
    Star,
    Activity,
    DollarSign,
    Calendar,
    Eye,
    Zap
} from "lucide-react";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, ProductVariant } from "@/types";
import { money } from "@/utils/inventory";
import products from "@/routes/inventory/products";
import { dashboard } from '@/routes';
import { cn } from "@/lib/utils";

const useThemeColor = (cssVariable: string, fallbackColor: string) => {
    const [color, setColor] = React.useState(fallbackColor);

    React.useEffect(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        const colorValue = rootStyles.getPropertyValue(cssVariable).trim();

        if (colorValue) {
            setColor(colorValue.includes(" ") ? `hsl(${colorValue})` : colorValue);
        }
    }, []);

    return color;
};

// --- TYPES ---
interface Props {
    stats: {
        sales_today_revenue: number;
        sales_today_count: number;
        sales_today_average_ticket: number;
        purchases_draft_count: number;
        purchases_total_due: number;
        low_stock_items_count: number;
    };
    lowStockVariants: (ProductVariant & { product: { name: string }, inventory: [{ quantity: number }] })[];
    salesChartData: { date: string; total: number }[];
}

// --- SUB-COMPONENTS MEJORADOS ---
const StatCard = ({
    title,
    value,
    icon,
    description,
    className,
    trend,
    color = 'primary'
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
    className?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'primary' | 'emerald' | 'amber' | 'red' | 'blue';
}) => {
    const colorClasses = {
        primary: 'from-primary/10 to-primary/5 border-primary/20',
        emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
        amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
        red: 'from-red-500/10 to-red-500/5 border-red-500/20',
        blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20'
    };

    const iconColorClasses = {
        primary: 'bg-primary/15 text-primary border-primary/30',
        emerald: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
        amber: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
        red: 'bg-red-500/15 text-red-600 border-red-500/30',
        blue: 'bg-blue-500/15 text-blue-600 border-blue-500/30'
    };

    return (
        <Card className={cn(
            "group relative overflow-hidden border-2 border-border/50 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1",
            className
        )}>
            {/* Gradiente de fondo mejorado */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity duration-300",
                colorClasses[color]
            )} />

            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail opacity-80"></div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                        {title}
                    </CardTitle>
                    {trend && (
                        <div className="flex items-center gap-1">
                            <ArrowUpRight className={cn(
                                "w-3 h-3",
                                trend === 'up' && "text-emerald-500 rotate-0",
                                trend === 'down' && "text-red-500 rotate-90",
                                trend === 'neutral' && "text-muted-foreground rotate-45"
                            )} />
                            <span className="text-xs font-medium text-muted-foreground">
                                {trend === 'up' ? 'Subiendo' : trend === 'down' ? 'Bajando' : 'Estable'}
                            </span>
                        </div>
                    )}
                </div>

                <div className={cn(
                    "relative p-3 rounded-xl border backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:rotate-3",
                    iconColorClasses[color]
                )}>
                    {icon}
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
            </CardHeader>

            <CardContent className="relative space-y-2">
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-foreground group-hover:text-primary transition-colors duration-200">
                        {value}
                    </span>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {description && (
                    <p className="text-xs font-medium text-muted-foreground bg-background/60 backdrop-blur-sm rounded-lg px-2 py-1 inline-block">
                        {description}
                    </p>
                )}
            </CardContent>

            {/* Efecto de onda en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out opacity-0 group-hover:opacity-100"></div>
        </Card>
    );
};

const breadcrumbs: BreadcrumbItem[] = [{ title: "Dashboard", href: dashboard().url }];

// --- MAIN COMPONENT ---
export default function Dashboard({ stats, lowStockVariants, salesChartData }: Props) {
    const formattedChartData = salesChartData.map(item => ({
        name: new Date(item.date).toLocaleDateString('es-DO', { weekday: 'short' }),
        Total: item.total,
    }));

    const primaryColor = useThemeColor('--primary', '#3AB795');
    const mutedColor = useThemeColor('--muted-foreground', '#6b7280');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8">
                {/* Header mejorado */}
                <div className="relative">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-primary/20 rounded-2xl p-3 border border-primary/30">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-foreground tracking-tight">Dashboard General</h1>
                            <p className="text-muted-foreground font-medium">Visión general de tu negocio en tiempo real</p>
                        </div>
                    </div>

                    {/* Indicador de tiempo */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/30 w-fit">
                        <Calendar className="w-4 h-4" />
                        <span>Actualizado: {new Date().toLocaleString('es-DO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>

                {/* KPIs principales mejorados */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard
                        title="Ventas de Hoy"
                        value={money(stats.sales_today_revenue)}
                        icon={<TrendingUp className="h-5 w-5" />}
                        description={`${stats.sales_today_count} ventas realizadas`}
                        trend="up"
                        color="emerald"
                    />
                    <StatCard
                        title="Ticket Promedio"
                        value={money(stats.sales_today_average_ticket)}
                        icon={<Receipt className="h-5 w-5" />}
                        description="Por transacción hoy"
                        trend="neutral"
                        color="blue"
                    />
                    <StatCard
                        title="Compras Pendientes"
                        value={String(stats.purchases_draft_count)}
                        icon={<ShoppingCart className="h-5 w-5" />}
                        description="En borrador"
                        trend={stats.purchases_draft_count > 0 ? "up" : "neutral"}
                        color="amber"
                    />
                    <StatCard
                        title="Por Pagar"
                        value={money(stats.purchases_total_due)}
                        icon={<DollarSign className="h-5 w-5" />}
                        description="Balance pendiente"
                        trend={stats.purchases_total_due > 0 ? "up" : "neutral"}
                        color="red"
                    />
                    <StatCard
                        title="Stock Crítico"
                        value={String(stats.low_stock_items_count)}
                        icon={<Package className="h-5 w-5" />}
                        description="Requieren reposición"
                        trend={stats.low_stock_items_count > 0 ? "down" : "neutral"}
                        color="amber"
                    />
                </div>

                {/* Gráfico y alertas mejorados */}
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Gráfico de ventas mejorado */}
                    <Card className="lg:col-span-2 border-2 border-border/50 rounded-2xl shadow-xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail"></div>

                        <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent p-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/20 rounded-xl p-2 border border-primary/30">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Ventas de los Últimos 7 Días</CardTitle>
                                    <CardDescription className="font-medium">
                                        Tendencia de ingresos diarios • Total: {money(salesChartData.reduce((sum, day) => sum + day.total, 0))}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={formattedChartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                    <CartesianGrid
                                        vertical={false}
                                        strokeOpacity={0.2}
                                        strokeDasharray="3 3"
                                        stroke={mutedColor}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        stroke={mutedColor}
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke={mutedColor}
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        cursor={{
                                            fill: 'hsl(var(--primary))',
                                            opacity: 0.1,
                                            radius: 8
                                        }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '2px solid hsl(var(--primary))',
                                            borderRadius: 'var(--radius-lg)',
                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                            backdropFilter: 'blur(8px)'
                                        }}
                                        labelStyle={{
                                            color: 'hsl(var(--foreground))',
                                            fontWeight: '600',
                                            marginBottom: '4px'
                                        }}
                                        itemStyle={{
                                            color: 'hsl(var(--primary))',
                                            fontWeight: '700'
                                        }}
                                    />
                                    <Bar
                                        dataKey="Total"
                                        fill={primaryColor}
                                        radius={[8, 8, 0, 0]}
                                        style={{
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Panel de alertas mejorado */}
                    <Card className="border-2 border-border/50 rounded-2xl shadow-xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500"></div>

                        <CardHeader className="bg-gradient-to-br from-red-500/5 to-amber-500/5 p-6">
                            <CardTitle className="flex items-center gap-3">
                                <div className="bg-red-500/20 rounded-xl p-2 border border-red-500/30">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <span className="text-lg font-bold">Alertas de Stock</span>
                                    {lowStockVariants.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                                            <span className="text-xs font-medium text-amber-600">
                                                Atención requerida
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription className="font-medium">
                                Productos que necesitan reposición urgente
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6">
                            {lowStockVariants.length > 0 ? (
                                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-stoneretail">
                                    {lowStockVariants.map(variant => (
                                        <div key={variant.id} className="group bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/30 hover:border-primary/30 hover:bg-accent/20 transition-all duration-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={products.edit.url({ product: variant.product_id })}
                                                        className="font-semibold text-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2 group"
                                                    >
                                                        <span className="truncate">{variant.product.name}</span>
                                                        <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                    </Link>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md font-mono">
                                                            SKU: {variant.sku}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1">
                                                        <Package className="w-3 h-3 text-red-600" />
                                                        <span className="text-sm font-bold text-red-600">
                                                            {variant.inventory[0]?.quantity ?? 0}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">unidades</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-xl opacity-40 animate-pulse"></div>
                                        <div className="relative bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-4">
                                            <Package className="w-8 h-8 text-emerald-600 mx-auto" />
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-lg text-foreground mb-2">¡Excelente!</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Todos los productos tienen stock suficiente
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}