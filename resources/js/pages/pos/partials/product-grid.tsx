
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Package, Search } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

// --- Tipos y Props ---

interface ProductGridProps {
    products: Product[];
    isLoading: boolean;
    viewMode: 'grid' | 'list';
    onProductClick: (product: Product) => void;
    searchQuery?: string; // Opcional, para mostrar un mensaje de "no resultados" más inteligente
}
/**
 * Muestra un esqueleto de carga que imita la estructura de la UI final.
 * Esto mejora la UX al evitar cambios bruscos de layout.
 */
const ProductCardSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 p-3 border rounded-lg bg-white dark:bg-slate-800">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
            </div>
        );
    }
    return (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800 flex flex-col">
            <div className="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            <div className="p-3 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse"></div>
            </div>
        </div>
    );
};

// --- Sub-componentes Internos ---

const LoadingState = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
    <div className={cn(
        viewMode === 'grid'
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
    )}>
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
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Sin resultados
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                    No se encontraron productos para "{searchQuery}".
                </p>
            </>
        ) : (
            <>
                <Package className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Listo para Vender
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                    Usa la barra de búsqueda para encontrar un producto.
                </p>
            </>
        )}
    </div>
);

const ProductCard = ({ product, viewMode, onClick }: { product: Product, viewMode: 'grid' | 'list', onClick: () => void }) => {
    const variant = (product as any)?.variants?.[0];
    if (!variant) return null;

    const imageUrl = variant.image_url ?? null;
    const price = Number(variant.selling_price || 0).toFixed(2);

    if (viewMode === 'list') {
        return (
            <div onClick={onClick} className="flex items-center gap-4 p-3 border rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                    {imageUrl ? <img src={imageUrl} alt={product.name} className="w-full h-full object-contain" /> : <Package className="w-8 h-8 text-slate-400" />}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {variant.sku || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">${price}</p>
                </div>
            </div>
        );
    }

    return (
        <div onClick={onClick} className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 flex flex-col">
            <div className="aspect-square flex-1 p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50">
                {imageUrl ? <img src={imageUrl} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" /> : <Package className="w-12 h-12 text-slate-400" />}
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">SKU: {variant.sku || 'N/A'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${price}</span>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---

export function ProductGrid({ products, isLoading, viewMode, onProductClick, searchQuery }: ProductGridProps) {

    // El contenedor principal ahora gestiona el alto y el scroll de forma más robusta
    return (
        <div className="h-full overflow-y-auto pr-2 pb-4">
            {isLoading && <LoadingState viewMode={viewMode} />}

            {!isLoading && products.length === 0 && <EmptyState searchQuery={searchQuery} />}

            {!isLoading && products.length > 0 && (
                <div className={cn(
                    "transition-opacity duration-300",
                    viewMode === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                        : "space-y-3"
                )}>
                    {products.map(product => (
                        <ProductCard
                            key={(product as any).variants[0]?.id || product.id}
                            product={product}
                            viewMode={viewMode}
                            onClick={() => onProductClick(product)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}