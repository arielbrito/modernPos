import * as React from "react";
import { Head, Link } from "@inertiajs/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

// --- LAYOUT, COMPONENTS & ICONS ---
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Package, ShoppingCart, TrendingUp, Receipt, AlertTriangle } from "lucide-react";

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, ProductVariant } from "@/types";
import { money } from "@/utils/inventory";
import products from "@/routes/inventory/products";
import { dashboard } from '@/routes';
import { cn } from "@/lib/utils";


const useThemeColor = (cssVariable: string, fallbackColor: string) => {
    const [color, setColor] = React.useState(fallbackColor);

    React.useEffect(() => {
        // Leemos el valor directo de la variable CSS.
        const rootStyles = getComputedStyle(document.documentElement);
        const colorValue = rootStyles.getPropertyValue(cssVariable).trim();

        if (colorValue) {
            // Si el valor es HSL (ej: 222.2 84% 4.9%), lo envolvemos en hsl(). Si es HEX, lo usamos directamente.
            // Esta lógica es más robusta.
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

// --- SUB-COMPONENTS ---
const StatCard = ({ title, value, icon, description, className }: { title: string, value: string, icon: React.ReactNode, description?: string, className?: string }) => (
    <Card className={cn("overflow-hidden", className)}>
        {/* Fondo decorativo con gradiente sutil */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {/* Icono con fondo para más contraste */}
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {icon}
            </div>
        </CardHeader>
        <CardContent className="relative">
            <div className="text-2xl font-bold">{value}</div>
            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
        </CardContent>
    </Card>
);

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
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <h1 className="text-2xl font-bold">Dashboard General</h1>

                {/* --- KPIs PRINCIPALES --- */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard title="Ventas de Hoy" value={money(stats.sales_today_revenue)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} description={`${stats.sales_today_count} ventas`} />
                    <StatCard title="Ticket Promedio (Hoy)" value={money(stats.sales_today_average_ticket)} icon={<Receipt className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Compras en Borrador" value={String(stats.purchases_draft_count)} icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} description="Pendientes de aprobar" />
                    <StatCard title="Cuentas por Pagar" value={money(stats.purchases_total_due)} icon={<Receipt className="h-4 w-4 text-muted-foreground" />} description="Balance en compras recibidas" />
                    <StatCard title="Items con Stock Bajo" value={String(stats.low_stock_items_count)} icon={<Package className="h-4 w-4 text-muted-foreground" />} description="Necesitan reposición" />
                </div>

                {/* --- GRÁFICO Y ALERTAS --- */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={formattedChartData}>
                                    <CartesianGrid vertical={false} strokeOpacity={0.2} />
                                    <XAxis dataKey="name" stroke={mutedColor} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke={mutedColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 'var(--radius-lg)'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="Total" fill={primaryColor} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Alerta de Stock Bajo
                            </CardTitle>
                            <CardDescription>Productos que necesitan reposición urgente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {lowStockVariants.length > 0 ? (
                                <Table>
                                    <TableBody>
                                        {lowStockVariants.map(variant => (
                                            <TableRow key={variant.id}>
                                                <TableCell>
                                                    <Link href={products.edit.url({ product: variant.product_id })} className="font-medium hover:underline">
                                                        {variant.product.name}
                                                    </Link>
                                                    <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-destructive font-bold">
                                                    {variant.inventory[0]?.quantity ?? 0} Unidades
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">¡Todo bien! No hay productos con stock bajo.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}