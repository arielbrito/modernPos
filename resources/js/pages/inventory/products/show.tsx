/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// resources/js/pages/inventory/products/show.tsx
import { useMemo, useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import QuickAdjustDialog from './partials/quickAdjustDialog';
import {
    Pencil,
    PlusCircle,
    Download,
    MoreVertical,
    ArrowLeft,
    Share2,
    Printer,
    Eye,
    EyeOff,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Package,
    Store,
    Calendar,
    DollarSign,
    BarChart3,
    RefreshCw,
    Filter,
    Search,
    ExternalLink,
    Copy,
    Archive,
    ShoppingCart,
    Loader2,
    CheckCircle,
    XCircle,
    ImageIcon,
    ZoomIn,
    Activity
} from 'lucide-react';



type Variant = {
    id: number;
    sku: string;
    selling_price: string;
    cost_price: string;
    attributes?: Record<string, any> | null;
    image_url?: string | null;
};

type ProductShow = {
    id: number;
    name: string;
    slug: string;
    type: 'simple' | 'variable';
    description?: string | null;
    is_active: boolean;
    unit?: string;
    category?: { id: number; name: string } | null;
    supplier?: { id: number; name: string } | null;
    variants: Variant[];
    created_at?: string;
    updated_at?: string;
};

type StockSummary = {
    total: number;
    per_store: { store: { id: number; name: string }; qty: number; threshold: number; low: boolean }[];
};

type Movement = {
    id: number;
    date: string;
    type: 'purchase_entry' | 'sale_exit' | 'adjustment_in' | 'adjustment_out' | 'purchase_return_exit' | 'sale_return_entry';
    quantity: number | string;
    unit_price: number | string;
    subtotal: number | string;
    store?: { id: number; name: string } | null;
    variant?: { id: number; sku: string } | null;
    user?: { id: number; name: string } | null;
};

function formatMoney(n: number | string) {
    const num = typeof n === 'string' ? parseFloat(n || '0') : n;
    return num.toLocaleString('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(n: number | string) {
    const num = typeof n === 'string' ? parseFloat(n || '0') : n;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeLabel = {
    purchase_entry: 'Entrada (Compra)',
    sale_exit: 'Salida (Venta)',
    adjustment_in: 'Ajuste +',
    adjustment_out: 'Ajuste −',
    purchase_return_exit: 'Salida (Devolución Compra)',
    sale_return_entry: 'Entrada (Devolución Venta)',
} as const;

const typeTone = {
    purchase_entry: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    adjustment_in: 'bg-blue-100 text-blue-700 border-blue-200',
    sale_exit: 'bg-orange-100 text-orange-700 border-orange-200',
    adjustment_out: 'bg-rose-100 text-rose-700 border-rose-200',
    purchase_return_exit: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    sale_return_entry: 'bg-lime-100 text-lime-700 border-lime-200',
} as const;

const typeIcons = {
    purchase_entry: ShoppingCart,
    adjustment_in: TrendingUp,
    sale_exit: Package,
    adjustment_out: TrendingDown,
    purchase_return_exit: ArrowLeft,
    sale_return_entry: ExternalLink,
} as const;

// Skeleton Components
const ProductHeaderSkeleton = () => (
    <div className="flex items-start gap-6">
        <Skeleton className="h-32 w-32 rounded-xl" />
        <div className="flex-1 space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-80" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    </div>
);

const TableSkeleton = ({ rows = 5, cols = 8 }) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                ))}
            </div>
        ))}
    </div>
);

export default function Show({
    product,
    stock,
    movements,
    stores,
}: {
    product: ProductShow;
    stock: StockSummary;
    movements: Movement[];
    stores: { id: number; name: string }[];
}) {
    // Estados
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [variantForAdjust, setVariantForAdjust] = useState<number | null>(product.variants[0]?.id ?? null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isToggling, setIsToggling] = useState(false);

    // Filtros movimientos
    const [qType, setQType] = useState<string>('all');
    const [qStore, setQStore] = useState<string>('all');
    const [qSku, setQSku] = useState('');
    const [dateRange, setDateRange] = useState<string>('all');

    const cover = product.variants.find(v => v.image_url)?.image_url ?? null;
    const allImages = product.variants.filter(v => v.image_url).map(v => v.image_url!);

    const storeOptions = useMemo(() => {
        return stores?.length ? stores : stock.per_store.map(s => s.store);
    }, [stores, stock]);

    // Estadísticas calculadas
    const stockStats = useMemo(() => {
        const lowStockStores = stock.per_store.filter(s => s.low).length;
        const totalStores = stock.per_store.length;
        const averageStock = totalStores > 0 ? stock.total / totalStores : 0;

        return {
            lowStockStores,
            totalStores,
            averageStock,
            stockHealth: lowStockStores === 0 ? 'good' : lowStockStores < totalStores / 2 ? 'warning' : 'critical'
        };
    }, [stock]);

    const movementStats = useMemo(() => {
        const last30Days = movements.filter(m => {
            const moveDate = new Date(m.date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return moveDate >= thirtyDaysAgo;
        });

        const entries = last30Days.filter(m => m.type === 'purchase_entry' || m.type === 'adjustment_in');
        const exits = last30Days.filter(m => m.type === 'sale_exit' || m.type === 'adjustment_out');

        const totalEntries = entries.reduce((sum, m) => sum + Number(m.quantity), 0);
        const totalExits = exits.reduce((sum, m) => sum + Number(m.quantity), 0);
        const netMovement = totalEntries - totalExits;

        return {
            totalMovements: last30Days.length,
            totalEntries,
            totalExits,
            netMovement,
            trend: netMovement > 0 ? 'positive' : netMovement < 0 ? 'negative' : 'neutral'
        };
    }, [movements]);

    const variantStats = useMemo(() => {
        const totalCost = product.variants.reduce((sum, v) => sum + Number(v.cost_price), 0);
        const totalSelling = product.variants.reduce((sum, v) => sum + Number(v.selling_price), 0);
        const averageMargin = product.variants.length > 0
            ? ((totalSelling - totalCost) / totalSelling) * 100
            : 0;

        return {
            totalVariants: product.variants.length,
            averageCost: totalCost / product.variants.length || 0,
            averagePrice: totalSelling / product.variants.length || 0,
            averageMargin: isNaN(averageMargin) ? 0 : averageMargin
        };
    }, [product.variants]);

    // Filtrado de movimientos con fecha
    const filtered = useMemo(() => {
        return movements.filter(m => {
            const typeOk = qType === 'all' || m.type === qType;
            const storeOk = qStore === 'all' || String(m.store?.id) === qStore;
            const skuOk = !qSku || (m.variant?.sku ?? '').toLowerCase().includes(qSku.toLowerCase());

            let dateOk = true;
            if (dateRange !== 'all') {
                const moveDate = new Date(m.date);
                const now = new Date();
                const days = parseInt(dateRange);
                const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                dateOk = moveDate >= cutoffDate;
            }

            return typeOk && storeOk && skuOk && dateOk;
        });
    }, [movements, qType, qStore, qSku, dateRange]);

    // Funciones de manejo
    const handleToggleStatus = useCallback(async () => {
        setIsToggling(true);
        try {
            router.patch(`/inventory/products/${product.id}/toggle-status`, {}, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Producto ${!product.is_active ? 'activado' : 'desactivado'} correctamente`);
                },
                onError: () => {
                    toast.error("No se pudo cambiar el estado del producto");
                },
                onFinish: () => setIsToggling(false)
            });
        } catch (error) {
            setIsToggling(false);
        }
    }, [product.id, product.is_active]);

    const handleCopySku = (sku: string) => {
        navigator.clipboard.writeText(sku);
        toast.info("El SKU ha sido copiado al portapapeles");
    };

    const handleRefreshData = () => {
        setIsLoading(true);
        router.visit(window.location.href, { preserveState: true, preserveScroll: true, onFinish: () => setIsLoading(false) });
    };

    const clearFilters = () => {
        setQType('all');
        setQStore('all');
        setQSku('');
        setDateRange('all');
    };

    const activeFiltersCount = [qType !== 'all', qStore !== 'all', qSku !== '', dateRange !== 'all'].filter(Boolean).length;

    // Breadcrumbs mejorados
    const breadcrumbs = [
        { title: 'Productos', href: '/inventory/products' },
        { title: product.name, href: `/inventory/products/${product.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Producto: ${product.name}`} />
            <TooltipProvider>
                <div className="max-w-7xl mx-auto py-8 space-y-8">

                    {/* Header mejorado */}
                    <div className="flex items-start gap-6">
                        <div className="relative group">
                            <div className="h-32 w-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-border hover:border-primary transition-colors">
                                {cover ? (
                                    <>
                                        <img
                                            src={cover}
                                            alt={product.name}
                                            className="h-full w-full object-cover cursor-pointer"
                                            onClick={() => {
                                                setSelectedImage(cover);
                                                setImageDialogOpen(true);
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <span className="text-xs text-muted-foreground">Sin imagen</span>
                                    </div>
                                )}
                            </div>

                            {allImages.length > 1 && (
                                <Badge className="absolute -bottom-2 -right-2 text-xs">
                                    +{allImages.length - 1}
                                </Badge>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-bold">{product.name}</h1>
                                        <Badge
                                            variant={product.type === 'simple' ? 'secondary' : 'default'}
                                            className="text-xs"
                                        >
                                            {product.type === 'simple' ? 'Producto Simple' : 'Con Variantes'}
                                        </Badge>
                                        <Badge
                                            variant={product.is_active ? 'default' : 'destructive'}
                                            className="flex items-center gap-1"
                                        >
                                            {product.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {product.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>

                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <div className="flex items-center gap-4">
                                            {product.category && (
                                                <span className="flex items-center gap-1">
                                                    <Package className="h-4 w-4" />
                                                    Categoría: <strong>{product.category.name}</strong>
                                                </span>
                                            )}
                                            {product.supplier && (
                                                <span className="flex items-center gap-1">
                                                    <Store className="h-4 w-4" />
                                                    Proveedor: <strong>{product.supplier.name}</strong>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Package className="h-4 w-4" />
                                            Unidad: <strong>{product.unit ?? 'Unidad'}</strong>
                                        </div>
                                        {product.created_at && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Creado: <strong>{new Date(product.created_at).toLocaleDateString('es-DO')}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones rápidas */}
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleRefreshData}
                                                    disabled={isLoading}
                                                >
                                                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Actualizar datos</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => handleCopySku(product.variants[0]?.sku || '')}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copiar SKU
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Share2 className="mr-2 h-4 w-4" />
                                                Compartir
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Printer className="mr-2 h-4 w-4" />
                                                Imprimir
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={handleToggleStatus}
                                                disabled={isToggling}
                                            >
                                                {isToggling ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : product.is_active ? (
                                                    <EyeOff className="mr-2 h-4 w-4" />
                                                ) : (
                                                    <Eye className="mr-2 h-4 w-4" />
                                                )}
                                                {product.is_active ? 'Desactivar' : 'Activar'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                                <Archive className="mr-2 h-4 w-4" />
                                                Archivar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Botones de acción principales */}
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link href={`/inventory/products/${product.id}/edit`}>
                                    <Button className="gap-2">
                                        <Pencil className="h-4 w-4" />
                                        Editar Producto
                                    </Button>
                                </Link>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={variantForAdjust ? String(variantForAdjust) : ''}
                                        onValueChange={v => setVariantForAdjust(parseInt(v, 10))}
                                    >
                                        <SelectTrigger className="w-64">
                                            <SelectValue placeholder="Seleccionar variante" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {product.variants.map(v => (
                                                <SelectItem key={v.id} value={String(v.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs">{v.sku || `#${v.id}`}</span>
                                                        {v.attributes && (
                                                            <span className="text-muted-foreground text-xs">
                                                                {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setAdjustOpen(true)}
                                        disabled={!variantForAdjust}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Ajuste Rápido
                                    </Button>
                                </div>

                                <Button variant="outline" className="gap-2" asChild>
                                    <a
                                        href={`/inventory/products/${product.id}/movements/export`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="h-4 w-4" />
                                        Exportar CSV
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard de estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Stock Total</p>
                                        <p className="text-3xl font-bold">{stock.total.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Promedio por tienda: {stockStats.averageStock.toFixed(1)}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stockStats.stockHealth === 'good' ? 'bg-green-100' :
                                        stockStats.stockHealth === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                                        }`}>
                                        <Package className={`h-6 w-6 ${stockStats.stockHealth === 'good' ? 'text-green-600' :
                                            stockStats.stockHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                            }`} />
                                    </div>
                                </div>
                                {stockStats.lowStockStores > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                                        <AlertTriangle className="h-3 w-3" />
                                        {stockStats.lowStockStores} tienda{stockStats.lowStockStores !== 1 ? 's' : ''} con stock bajo
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Movimiento (30d)</p>
                                        <p className="text-2xl font-bold">{movementStats.totalMovements}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Neto: {movementStats.netMovement > 0 ? '+' : ''}{movementStats.netMovement}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${movementStats.trend === 'positive' ? 'bg-green-100' :
                                        movementStats.trend === 'negative' ? 'bg-red-100' : 'bg-gray-100'
                                        }`}>
                                        <Activity className={`h-6 w-6 ${movementStats.trend === 'positive' ? 'text-green-600' :
                                            movementStats.trend === 'negative' ? 'text-red-600' : 'text-gray-600'
                                            }`} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                    <span className="text-green-600">↑ {movementStats.totalEntries} entradas</span>
                                    <span className="text-red-600">↓ {movementStats.totalExits} salidas</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Precio Promedio</p>
                                        <p className="text-2xl font-bold">{formatMoney(variantStats.averagePrice)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Costo: {formatMoney(variantStats.averageCost)}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-full bg-blue-100">
                                        <DollarSign className="h-6 w-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="mt-2 text-xs">
                                    <span className={`font-medium ${variantStats.averageMargin >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        Margen: {variantStats.averageMargin.toFixed(1)}%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Variantes</p>
                                        <p className="text-3xl font-bold">{variantStats.totalVariants}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stockStats.totalStores} tienda{stockStats.totalStores !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-full bg-purple-100">
                                        <BarChart3 className="h-6 w-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contenido con tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                            <TabsTrigger value="overview" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Resumen</span>
                            </TabsTrigger>
                            <TabsTrigger value="stock" className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span className="hidden sm:inline">Stock</span>
                            </TabsTrigger>
                            <TabsTrigger value="movements" className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                <span className="hidden sm:inline">Movimientos</span>
                                {filtered.length !== movements.length && (
                                    <Badge variant="secondary" className="text-xs">
                                        {filtered.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="variants" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                <span className="hidden sm:inline">Variantes</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab: Resumen */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Descripción */}
                            {product.description && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Descripción</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-sm max-w-none">
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                                {product.description}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Galería de imágenes */}
                            {allImages.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Galería de Imágenes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {allImages.map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group hover:ring-2 hover:ring-primary transition-all"
                                                    onClick={() => {
                                                        setSelectedImage(img);
                                                        setImageDialogOpen(true);
                                                    }}
                                                >
                                                    <img
                                                        src={img}
                                                        alt={`${product.name} - imagen ${idx + 1}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Resumen de stock */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumen de Stock</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="text-4xl font-bold mb-2">{stock.total.toLocaleString()}</div>
                                            <p className="text-muted-foreground">Unidades totales en inventario</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span>Tiendas con stock</span>
                                                <span className="font-medium">{stock.per_store.filter(s => s.qty > 0).length}/{stockStats.totalStores}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span>Tiendas con stock bajo</span>
                                                <span className={`font-medium ${stockStats.lowStockStores > 0 ? 'text-destructive' : ''}`}>
                                                    {stockStats.lowStockStores}/{stockStats.totalStores}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span>Promedio por tienda</span>
                                                <span className="font-medium">{stockStats.averageStock.toFixed(1)} unidades</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                        </TabsContent>

                        {/* Tab: Stock */}
                        <TabsContent value="stock" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Stock por Tienda
                                        <div className="text-sm font-normal text-muted-foreground">
                                            Total: {stock.total} unidades
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {stock.per_store.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No hay stock registrado en ninguna tienda</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tienda</TableHead>
                                                    <TableHead className="text-center">Estado</TableHead>
                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                    <TableHead className="text-right">Umbral</TableHead>
                                                    <TableHead className="text-right">% del Total</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {stock.per_store.map(({ store, qty, threshold, low }) => (
                                                    <TableRow key={store.id} className={low ? 'bg-destructive/5' : ''}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                                {store.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {qty === 0 ? (
                                                                <Badge variant="outline" className="bg-gray-50">
                                                                    Sin stock
                                                                </Badge>
                                                            ) : low ? (
                                                                <Badge variant="destructive" className="flex items-center gap-1 w-fit mx-auto">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Stock bajo
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="default" className="bg-green-100 text-green-700">
                                                                    Normal
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`font-medium ${qty === 0 ? 'text-muted-foreground' : low ? 'text-destructive' : ''}`}>
                                                                {qty.toLocaleString()}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {threshold.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {stock.total > 0 ? ((qty / stock.total) * 100).toFixed(1) : '0.0'}%
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                // Aquí iría la lógica para ajustar stock por tienda
                                                                                toast.info("Ajuste por tienda estará disponible pronto");
                                                                            }}
                                                                        >
                                                                            <PlusCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Ajustar stock</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Movimientos */}
                        <TabsContent value="movements" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        Movimientos de Inventario
                                        <div className="flex items-center gap-2">
                                            {activeFiltersCount > 0 && (
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <Filter className="h-3 w-3" />
                                                    {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            <span className="text-sm font-normal text-muted-foreground">
                                                {filtered.length} de {movements.length}
                                            </span>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Filtros mejorados */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                                            <Select value={qType} onValueChange={setQType}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                                    <SelectItem value="purchase_entry">
                                                        <div className="flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4" />
                                                            Entrada (Compra)
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="sale_exit">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-4 w-4" />
                                                            Salida (Venta)
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="adjustment_in">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingUp className="h-4 w-4" />
                                                            Ajuste +
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="adjustment_out">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingDown className="h-4 w-4" />
                                                            Ajuste −
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tienda</label>
                                            <Select value={qStore} onValueChange={setQStore}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Tienda" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas las tiendas</SelectItem>
                                                    {storeOptions.map(s => (
                                                        <SelectItem key={s.id} value={String(s.id)}>
                                                            <div className="flex items-center gap-2">
                                                                <Store className="h-4 w-4" />
                                                                {s.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                                            <Select value={dateRange} onValueChange={setDateRange}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Período" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="7">Últimos 7 días</SelectItem>
                                                    <SelectItem value="30">Últimos 30 días</SelectItem>
                                                    <SelectItem value="90">Últimos 90 días</SelectItem>
                                                    <SelectItem value="365">Último año</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar SKU..."
                                                    value={qSku}
                                                    onChange={e => setQSku(e.target.value)}
                                                    className="h-9 pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="h-9"
                                            >
                                                Limpiar
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Estadísticas de movimientos filtrados */}
                                    {filtered.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-background border rounded-lg">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {filtered.filter(m => m.type === 'purchase_entry' || m.type === 'adjustment_in').length}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Entradas</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-red-600">
                                                    {filtered.filter(m => m.type === 'sale_exit' || m.type === 'adjustment_out').length}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Salidas</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">
                                                    {filtered.reduce((sum, m) => {
                                                        const qty = Number(m.quantity);
                                                        return sum + (m.type.includes('in') || m.type === 'purchase_entry' ? qty : -qty);
                                                    }, 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Neto</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">
                                                    {formatMoney(filtered.reduce((sum, m) => sum + Number(m.subtotal), 0))}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Valor</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tabla de movimientos */}
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Tienda</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                    <TableHead className="text-right">P.Unit</TableHead>
                                                    <TableHead className="text-right">Subtotal</TableHead>
                                                    <TableHead>Usuario</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isLoading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8}>
                                                            <TableSkeleton rows={5} cols={8} />
                                                        </TableCell>
                                                    </TableRow>
                                                ) : filtered.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center py-12">
                                                            <div className="text-muted-foreground">
                                                                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                                {activeFiltersCount > 0
                                                                    ? 'No se encontraron movimientos con los filtros aplicados'
                                                                    : 'No hay movimientos registrados'
                                                                }
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filtered.map(m => {
                                                        const TypeIcon = typeIcons[m.type];
                                                        return (
                                                            <TableRow key={m.id} className="hover:bg-muted/50">
                                                                <TableCell className="text-sm">
                                                                    <div className="flex flex-col">
                                                                        <span>{new Date(m.date).toLocaleDateString('es-DO')}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {new Date(m.date).toLocaleTimeString('es-DO', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${typeTone[m.type]}`}>
                                                                        <TypeIcon className="h-3 w-3" />
                                                                        {typeLabel[m.type]}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {m.store?.name ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Store className="h-4 w-4 text-muted-foreground" />
                                                                            {m.store.name}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {m.variant?.sku ? (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <span
                                                                                        className="font-mono text-xs cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                                                                                        onClick={() => handleCopySku(m.variant!.sku)}
                                                                                    >
                                                                                        {m.variant.sku}
                                                                                    </span>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>Click para copiar SKU</TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <span className={`font-medium ${m.type === 'sale_exit' || m.type === 'adjustment_out'
                                                                        ? 'text-red-600'
                                                                        : 'text-green-600'
                                                                        }`}>
                                                                        {m.type === 'sale_exit' || m.type === 'adjustment_out' ? '-' : '+'}
                                                                        {formatNumber(m.quantity)}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {formatMoney(m.unit_price)}
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold">
                                                                    {formatMoney(m.subtotal)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {m.user?.name ?? <span className="text-muted-foreground">—</span>}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Variantes */}
                        <TabsContent value="variants" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Variantes del Producto</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {product.variants.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                            <p>No hay variantes registradas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {product.variants.map((variant, idx) => (
                                                <Card key={variant.id} className="border-l-4 border-l-primary/20">
                                                    <CardContent className="p-6">
                                                        <div className="grid md:grid-cols-4 gap-6">
                                                            {/* Imagen de variante */}
                                                            <div className="flex items-center justify-center">
                                                                {variant.image_url ? (
                                                                    <div
                                                                        className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted cursor-pointer group hover:ring-2 hover:ring-primary transition-all"
                                                                        onClick={() => {
                                                                            setSelectedImage(variant.image_url!);
                                                                            setImageDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <img
                                                                            src={variant.image_url}
                                                                            alt={`Variante ${variant.sku}`}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                                                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Información de variante */}
                                                            <div className="md:col-span-3 space-y-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <span
                                                                                            className="font-mono text-lg font-semibold cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                                                                            onClick={() => handleCopySku(variant.sku)}
                                                                                        >
                                                                                            {variant.sku}
                                                                                        </span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>Click para copiar SKU</TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                            <Badge variant="outline">Variante #{idx + 1}</Badge>
                                                                        </div>

                                                                        {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                                {Object.entries(variant.attributes).map(([key, value]) => (
                                                                                    <Badge key={key} variant="secondary" className="text-xs">
                                                                                        {key}: {value}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon">
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    setVariantForAdjust(variant.id);
                                                                                    setAdjustOpen(true);
                                                                                }}
                                                                            >
                                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                                Ajustar stock
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleCopySku(variant.sku)}>
                                                                                <Copy className="mr-2 h-4 w-4" />
                                                                                Copiar SKU
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>

                                                                {/* Métricas de variante */}
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                                        <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                                                        <div className="text-sm font-medium">Precio Venta</div>
                                                                        <div className="text-lg font-bold text-green-600">
                                                                            {formatMoney(variant.selling_price)}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                                        <Package className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                                                        <div className="text-sm font-medium">Costo</div>
                                                                        <div className="text-lg font-bold text-blue-600">
                                                                            {formatMoney(variant.cost_price)}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                                        <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                                                        <div className="text-sm font-medium">Margen</div>
                                                                        <div className="text-lg font-bold text-purple-600">
                                                                            {(() => {
                                                                                const cost = Number(variant.cost_price);
                                                                                const price = Number(variant.selling_price);
                                                                                const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                                                                                return `${margin.toFixed(1)}%`;
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                                        <Activity className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                                                        <div className="text-sm font-medium">Stock</div>
                                                                        <div className="text-lg font-bold">
                                                                            {stock.per_store.reduce((total, store) => total + store.qty, 0)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Dialog de ajuste rápido */}
                {variantForAdjust && (
                    <QuickAdjustDialog
                        open={adjustOpen}
                        onOpenChange={setAdjustOpen}
                        variantId={variantForAdjust}
                        stores={storeOptions}
                    />
                )}

                {/* Dialog de imagen */}
                <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Vista de Imagen</DialogTitle>
                            <DialogDescription>
                                Imagen del producto {product.name}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedImage && (
                            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden rounded-lg bg-muted">
                                <img
                                    src={selectedImage}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        )}

                        <DialogFooter className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {allImages.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {allImages.findIndex(img => img === selectedImage) + 1} de {allImages.length}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentIndex = allImages.findIndex(img => img === selectedImage);
                                                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
                                                    setSelectedImage(allImages[prevIndex]);
                                                }}
                                            >
                                                ← Anterior
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentIndex = allImages.findIndex(img => img === selectedImage);
                                                    const nextIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
                                                    setSelectedImage(allImages[nextIndex]);
                                                }}
                                            >
                                                Siguiente →
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    {/* <a ref={selectedImage} target="_blank" rel="noopener noreferrer"> */}
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir original
                                    {/* </a> */}
                                </Button>
                                <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                                    Cerrar
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TooltipProvider>
        </AppLayout>
    );
}