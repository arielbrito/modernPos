/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Product, ProductVariant } from '@/types';
import { cn } from '@/lib/utils';

// Componentes de UI
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Search, AlertTriangle, Star, TrendingUp } from 'lucide-react';

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
            <div className="flex items-center gap-3 sm:gap-4 p-3 border rounded-xl bg-white dark:bg-slate-800 animate-stoneretail-pulse">
                <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg flex-shrink-0 gradient-stoneretail-light" />
                <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="h-4 w-full max-w-[200px] rounded-md" />
                    <Skeleton className="h-3 w-3/4 max-w-[120px] rounded-md" />
                </div>
                <div className="space-y-2 text-right flex-shrink-0">
                    <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-md" />
                    <Skeleton className="h-3 w-12 sm:w-16 rounded-md" />
                </div>
            </div>
        );
    }
    return (
        <Card className="overflow-hidden rounded-xl shadow-lg animate-stoneretail-pulse">
            <Skeleton className="aspect-square w-full gradient-stoneretail-light" />
            <div className="p-3 sm:p-4 space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="flex justify-between items-center gap-2">
                    <Skeleton className="h-5 sm:h-6 w-1/2 flex-shrink-0 rounded-md" />
                    <Skeleton className="h-3 sm:h-4 w-1/3 flex-shrink-0 rounded-md" />
                </div>
            </div>
        </Card>
    );
};

const LoadingState = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
    <div className={cn(
        viewMode === 'grid'
            ? "grid gap-4 sm:gap-5 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
            : "space-y-3"
    )}>
        {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} viewMode={viewMode} />
        ))}
    </div>
);

const EmptyState = ({ searchQuery }: { searchQuery?: string }) => (
    <div className="text-center py-16 sm:py-24 h-full flex flex-col justify-center items-center px-4">
        <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-2xl opacity-30 animate-pulse"></div>
            {searchQuery ? (
                <Search className="relative w-20 h-20 sm:w-24 sm:h-24 text-primary mx-auto" />
            ) : (
                <Package className="relative w-20 h-20 sm:w-24 sm:h-24 text-primary mx-auto" />
            )}
        </div>

        {searchQuery ? (
            <>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">Sin Resultados</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md leading-relaxed">
                    No se encontraron productos para <span className="font-semibold text-primary bg-accent px-2 py-1 rounded-md">"{searchQuery}"</span>
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 opacity-75">
                    Intenta con otros términos de búsqueda
                </p>
            </>
        ) : (
            <>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">Listo para Vender</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md leading-relaxed mb-4">
                    Usa la barra de búsqueda para encontrar productos y comenzar a vender.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/75">
                    <TrendingUp className="w-4 h-4" />
                    <span>StoneRetail POS</span>
                </div>
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
                    "group flex items-center gap-4 p-4 pos-card transition-all duration-300 ",
                    "min-h-[80px] sm:min-h-[88px] border-l-4 border-l-transparent",
                    isOutOfStock
                        ? "opacity-50 cursor-not-allowed grayscale"
                        : "hover:bg-accent/30 dark:hover:bg-accent/20 cursor-pointer hover:border-l-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                )}
            >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-accent/50 dark:bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:shadow-lg transition-shadow">
                    {primaryVariant.image_url ? (
                        <>
                            <img
                                src={primaryVariant.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </>
                    ) : (
                        <Package className="w-7 h-7 sm:w-8 sm:h-8 text-primary/60" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            SKU: {primaryVariant.sku || 'N/A'}
                        </p>
                        {!isOutOfStock && !isLowStock && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        )}
                    </div>
                </div>

                <div className="text-right flex-shrink-0 min-w-[100px] sm:min-w-[120px]">
                    <p className="font-bold text-primary text-lg sm:text-xl whitespace-nowrap mb-1">
                        {formatCurrency(primaryVariant.selling_price)}
                    </p>
                    {product.product_nature === 'stockable' && (
                        isOutOfStock ? (
                            <Badge variant="destructive" className="text-xs rounded-lg shadow-sm">
                                Agotado
                            </Badge>
                        ) : (
                            <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded-md",
                                isLowStock ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "text-muted-foreground"
                            )}>
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
                "group border-2 rounded-2xl overflow-hidden shadow-md transition-all duration-300 pos-card flex flex-col backdrop-blur-sm",
                "min-h-[160px] sm:min-h-[260px] relative",
                isOutOfStock
                    ? "opacity-50 cursor-not-allowed grayscale border-muted"
                    : "hover:shadow-2xl hover:border-primary/50 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] border-border/50"
            )}
        >
            {/* Efecto de brillo sutil */}
            {!isOutOfStock && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            )}

            <div className="relative flex-1">
                <div className="aspect-square w-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-muted/30 dark:from-accent/10 dark:to-muted/20 relative overflow-hidden">
                    {primaryVariant.image_url ? (
                        <>
                            <img
                                src={primaryVariant.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-xl opacity-30 animate-pulse"></div>
                            <Package className="relative w-10 h-10 sm:w-14 sm:h-14 text-primary/70" />
                        </div>
                    )}
                </div>

                {/* Badges mejorados */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.product_nature === 'stockable' && isOutOfStock && (
                        <Badge variant="destructive" className="text-xs px-3 py-1 pos-badge-danger shadow-lg backdrop-blur-sm">
                            Agotado
                        </Badge>
                    )}
                    {product.product_nature === 'stockable' && isLowStock && (
                        <Badge className="pos-badge-warning hover:bg-amber-600 text-xs px-3 py-1 shadow-lg backdrop-blur-sm">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Poco Stock
                        </Badge>
                    )}
                    {!isOutOfStock && !isLowStock && product.product_nature === 'stockable' && stock > 50 && (
                        <Badge className="pos-badge-success text-xs px-3 py-1 shadow-lg backdrop-blur-sm">
                            <Star className="h-3 w-3 mr-1" />
                            Disponible
                        </Badge>
                    )}
                </div>
            </div>

            <div className="p-3 sm:p-4 flex flex-col justify-between min-h-[90px] sm:min-h-[100px] bg-card/95 backdrop-blur-sm">
                <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-2 mb-2 flex-1 group-hover:text-primary transition-colors duration-200">
                    {product.name}
                </h3>

                <div className="flex items-end justify-between gap-3 mt-auto">
                    <div className="flex-1">
                        <span className="text-base sm:text-lg lg:text-xl font-bold text-primary block">
                            {formatCurrency(primaryVariant.selling_price)}
                        </span>
                        {primaryVariant.sku && (
                            <span className="text-xs text-muted-foreground/75 block">
                                {primaryVariant.sku}
                            </span>
                        )}
                    </div>

                    {product.product_nature === 'stockable' && (
                        <div className="text-right flex-shrink-0">
                            <span className={cn(
                                'text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap block',
                                isLowStock || isOutOfStock
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                    : 'bg-accent text-accent-foreground'
                            )}>
                                Stock: {stock > 999 ? '999+' : stock}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

// --- COMPONENTE PRINCIPAL ---

export function ProductGrid({ products, isLoading, viewMode, onProductClick, searchQuery }: ProductGridProps) {
    return (
        <div className="h-full overflow-y-auto pr-2 sm:pr-3 pb-6 scrollbar-stoneretail">
            {isLoading && <LoadingState viewMode={viewMode} />}
            {!isLoading && products.length === 0 && <EmptyState searchQuery={searchQuery} />}
            {!isLoading && products.length > 0 && (
                <div className={cn(
                    "transition-all duration-500 ease-out",
                    viewMode === 'grid'
                        ? "grid gap-4 sm:gap-5 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5"
                        : "space-y-4"
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