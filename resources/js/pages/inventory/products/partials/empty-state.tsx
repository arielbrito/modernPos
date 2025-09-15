import React from 'react';
import { Button } from '@/components/ui/button';
import { PackageSearch, Plus } from 'lucide-react';

interface EmptyStateProps {
    onActionClick: () => void;
    hasFilters: boolean;
    onClearFilters: () => void;
}

export function EmptyState({ onActionClick, hasFilters, onClearFilters }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                {hasFilters ? (
                    <PackageSearch className="h-8 w-8 text-muted-foreground" />
                ) : (
                    <Plus className="h-8 w-8 text-muted-foreground" />
                )}
            </div>
            <h3 className="text-xl font-semibold">
                {hasFilters ? 'No se encontraron resultados' : 'Aún no hay productos'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {hasFilters
                    ? 'Intenta ajustar tus filtros de búsqueda o límpialos para ver todos los productos.'
                    : 'Crea tu primer producto para empezar a gestionar tu inventario.'
                }
            </p>
            {hasFilters ? (
                <Button className="mt-6" variant="outline" onClick={onClearFilters}>
                    Limpiar Filtros
                </Button>
            ) : (
                <Button className="mt-6" onClick={onActionClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Producto
                </Button>
            )}
        </div>
    );
}