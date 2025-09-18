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
    // En el TPV, asumimos que cada producto se muestra con su variante principal y el stock de esa variante.
    return (product.variants[0] as any)?.stock ?? 0;
};

const getPrimaryVariant = (product: Product): ProductVariant | null => (product as any)?.variants?.[0] ?? null;

// --- SUB-COMPONENTES DE ESTADO ---

const ProductCardSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 p-3 border rounded-lg bg-white dark:bg-slate-800">
                <Skeleton className="h-16 w-16 rounded-md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-2 text-right">
                    <Skeleton className="h-6 w-20 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                </div>
            </div>
        );
    }
    return (
        <Card className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </div>
        </Card>
    );
};

const LoadingState = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
    <div className={cn(viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-3")}>
        {Array.from({ length: 10 }).map((_, i) => (
            <ProductCardSkeleton key={i} viewMode={viewMode} />
        ))}
    </div>
);

const EmptyState = ({ searchQuery }: { searchQuery?: string }) => (
    <div className="text-center py-20 h-full flex flex-col justify-center items-center">
        {searchQuery ? (
            <>
                <Search className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Sin Resultados</h3>
                <p className="text-slate-500 dark:text-slate-400">No se encontraron productos para "{searchQuery}".</p>
            </>
        ) : (
            <>
                <Package className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Listo para Vender</h3>
                <p className="text-slate-500 dark:text-slate-400">Usa la barra de búsqueda para encontrar un producto.</p>
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
            <div onClick={handleClick} className={cn("flex items-center gap-4 p-3 border rounded-lg bg-white dark:bg-slate-800 transition-all", isOutOfStock ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer")}>
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center shrink-0">
                    {primaryVariant.image_url ? <img src={primaryVariant.image_url} alt={product.name} className="w-full h-full object-contain" /> : <Package className="w-8 h-8 text-slate-400" />}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {primaryVariant.sku || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(primaryVariant.selling_price)}</p>
                    {product.product_nature === 'stockable' && (
                        isOutOfStock
                            ? <Badge variant="destructive" className="mt-1">Agotado</Badge>
                            : <span className="text-xs text-muted-foreground">Disponible: {stock}</span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div onClick={handleClick} className={cn("group border rounded-xl overflow-hidden shadow-sm transition-all duration-300 bg-white dark:bg-slate-800 flex flex-col", isOutOfStock ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:border-emerald-400 cursor-pointer")}>
            <div className="relative">
                <div className="aspect-square w-full flex items-center justify-center bg-muted dark:bg-slate-800/30">
                    {primaryVariant.image_url ? <img src={primaryVariant.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <Package className="w-12 h-12 text-slate-400" />}
                </div>
                {product.product_nature === 'stockable' && isOutOfStock && <Badge variant="destructive" className="absolute top-2 left-2">Agotado</Badge>}
                {product.product_nature === 'stockable' && isLowStock && <Badge variant="secondary" className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />Poco Stock</Badge>}
            </div>
            <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2 line-clamp-2 flex-1">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(primaryVariant.selling_price)}</span>
                    {product.product_nature === 'stockable' && (
                        <span className={cn('text-sm font-medium', isLowStock || isOutOfStock ? 'text-amber-600' : 'text-muted-foreground')}>
                            Stock: {stock}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export function ProductGrid({ products, isLoading, viewMode, onProductClick, searchQuery }: ProductGridProps) {
    return (
        <div className="h-full overflow-y-auto pr-2 pb-4">
            {isLoading && <LoadingState viewMode={viewMode} />}
            {!isLoading && products.length === 0 && <EmptyState searchQuery={searchQuery} />}
            {!isLoading && products.length > 0 && (
                <div className={cn("transition-opacity duration-300", viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-3")}>
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