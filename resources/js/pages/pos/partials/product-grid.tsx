/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Product, ProductVariant } from '@/types';
import { cn } from '@/lib/utils';

// Componentes de UI
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Search, AlertTriangle } from 'lucide-react';

// --- TIPOS Y PROPS ---
interface ProductGridProps {
    products: Product[];
    isLoading: boolean;
    viewMode: 'grid' | 'list';
    onProductClick: (product: Product) => void;
    searchQuery?: string;
}

// --- FUNCIONES HELPER ---
const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

const getStockLevel = (product: Product): number => {
    if (product.product_nature === 'service') return Infinity;
    return (product.variants[0] as any)?.stock ?? 0;
};

const getPrimaryVariant = (product: Product): ProductVariant | null => (product as any)?.variants?.[0] ?? null;

// --- SUB-COMPONENTES DE ESTADO ---

const ProductCardSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-3 sm:gap-4 p-3 border rounded-lg bg-white dark:bg-slate-800">
                <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                    <Skeleton className="h-3 w-3/4 max-w-[120px]" />
                </div>
                <div className="space-y-2 text-right flex-shrink-0">
                    <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
                    <Skeleton className="h-3 w-12 sm:w-16" />
                </div>
            </div>
        );
    }
    return (
        <Card className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center gap-2">
                    <Skeleton className="h-5 sm:h-6 w-1/2 flex-shrink-0" />
                    <Skeleton className="h-3 sm:h-4 w-1/3 flex-shrink-0" />
                </div>
            </div>
        </Card>
    );
};

const LoadingState = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
    <div className={cn(
        viewMode === 'grid'
            ? "grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
            : "space-y-3"
    )}>
        {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} viewMode={viewMode} />
        ))}
    </div>
);

const EmptyState = ({ searchQuery }: { searchQuery?: string }) => (
    <div className="text-center py-12 sm:py-20 h-full flex flex-col justify-center items-center px-4">
        {searchQuery ? (
            <>
                <Search className="w-16 h-16 sm:w-20 sm:h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Sin Resultados</h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 text-center max-w-md">
                    No se encontraron productos para <span className="font-medium">"{searchQuery}"</span>
                </p>
            </>
        ) : (
            <>
                <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Listo para Vender</h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 text-center max-w-md">
                    Usa la barra de búsqueda para encontrar un producto.
                </p>
            </>
        )}
    </div>
);

// --- SUB-COMPONENTE PARA MOSTRAR UN PRODUCTO ---

const ProductDisplayItem = ({ product, viewMode, onProductClick }: {
    product: Product;
    viewMode: 'grid' | 'list';
    onProductClick: (product: Product) => void;
}) => {
    const primaryVariant = getPrimaryVariant(product);
    if (!primaryVariant) return null;

    const stock = getStockLevel(product);
    const isOutOfStock = product.product_nature === 'stockable' && stock <= 0;
    const isLowStock = product.product_nature === 'stockable' && stock > 0 && stock < 10;

    const handleClick = () => {
        if (!isOutOfStock) {
            onProductClick(product);
        }
    };

    if (viewMode === 'list') {
        return (
            <div
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 sm:gap-4 p-3 pos-card transition-all duration-200 ",
                    "min-h-[72px] sm:min-h-[80px]",
                    isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer hover:border-emerald-300 active:scale-[0.98]"
                )}
            >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center flex-shrink-0">
                    {primaryVariant.image_url ? (
                        <img
                            src={primaryVariant.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                            loading="lazy"
                        />
                    ) : (
                        <Package className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 mb-1">
                        {product.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                        SKU: {primaryVariant.sku || 'N/A'}
                    </p>
                </div>

                <div className="text-right flex-shrink-0 min-w-[80px] sm:min-w-[100px]">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base sm:text-lg whitespace-nowrap">
                        {formatCurrency(primaryVariant.selling_price)}
                    </p>
                    {product.product_nature === 'stockable' && (
                        isOutOfStock ? (
                            <Badge variant="destructive" className="mt-1 text-xs">Agotado</Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground block mt-1">
                                Disp: {stock > 999 ? '999+' : stock}
                            </span>
                        )
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card
            onClick={handleClick}
            className={cn(
                "group border rounded-xl overflow-hidden shadow-sm transition-all duration-300 pos-card  border-accent-foreground flex flex-col",
                "min-h-[150px] sm:min-h-[240px]",
                isOutOfStock
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-lg hover:border-emerald-400 cursor-pointer pos-hover active:scale-[0.98]"
            )}
        >
            <div className="relative flex-1">
                <div className="aspect-square w-full flex items-center justify-center bg-muted dark:bg-slate-800/30">
                    {primaryVariant.image_url ? (
                        <img
                            src={primaryVariant.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                        />
                    ) : (
                        <Package className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />
                    )}
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.product_nature === 'stockable' && isOutOfStock && (
                        <Badge variant="destructive" className="text-xs px-2 py-1 pos-badge-danger">
                            Agotado
                        </Badge>
                    )}
                    {product.product_nature === 'stockable' && isLowStock && (
                        <Badge variant="secondary" className="pos-badge-warning hover:bg-amber-600 text-xs px-2 py-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Poco Stock
                        </Badge>
                    )}
                </div>
            </div>

            <div className="p-2 sm:p-3 flex flex-col justify-between min-h-[80px] sm:min-h-[90px] ">
                <h3 className="font-semibold text-accent-foreground text-xs sm:text-sm leading-tight line-clamp-2 mb-2 flex-1">
                    {product.name}
                </h3>

                <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
                        {formatCurrency(primaryVariant.selling_price)}
                    </span>

                    {product.product_nature === 'stockable' && (
                        <span className={cn(
                            'text-xs font-medium whitespace-nowrap flex-shrink-0',
                            isLowStock || isOutOfStock ? 'text-amber-600' : 'text-muted-foreground'
                        )}>
                            Stock: {stock > 999 ? '999+' : stock}
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
};

// --- COMPONENTE PRINCIPAL ---

export function ProductGrid({ products, isLoading, viewMode, onProductClick, searchQuery }: ProductGridProps) {
    return (
        <div className="h-full overflow-y-auto pr-1 sm:pr-2 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            {isLoading && <LoadingState viewMode={viewMode} />}
            {!isLoading && products.length === 0 && <EmptyState searchQuery={searchQuery} />}
            {!isLoading && products.length > 0 && (
                <div className={cn(
                    "transition-opacity duration-300",
                    viewMode === 'grid'
                        ? "grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 shadow-sm"
                        : "space-y-3"
                )}>
                    {products.map(product => (
                        <ProductDisplayItem
                            key={getPrimaryVariant(product)?.id || product.id}
                            product={product}
                            viewMode={viewMode}
                            onProductClick={onProductClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}