import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Filter, List, Grid3X3, Plus, Trash2, X } from 'lucide-react';
import { useProductFilters } from '../hooks/useProductFilters'; // Importamos los tipos
import { useProductSelection } from '../hooks/useProductSelection';

interface ProductsToolbarProps {
    filters: ReturnType<typeof useProductFilters>;
    selection: ReturnType<typeof useProductSelection>;
    viewMode: 'table' | 'grid';
    onViewModeChange: (mode: 'table' | 'grid') => void;
    onAddNew: () => void;
}

export function ProductsToolbar({ filters, selection, viewMode, onViewModeChange, onAddNew }: ProductsToolbarProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={filters.searchValue}
                        onChange={(e) => filters.setSearchValue(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* De momento, el botón de filtros avanzados lo dejaremos como placeholder */}
                <Button variant="outline" className="shrink-0" disabled>
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                    {filters.activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">{filters.activeFilterCount}</Badge>
                    )}
                </Button>

                {/* Selectores de Vista */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                        <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" onClick={() => onViewModeChange('table')}><List className="h-4 w-4" /></Button>
                    </TooltipTrigger><TooltipContent>Vista de Tabla</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                        <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => onViewModeChange('grid')}><Grid3X3 className="h-4 w-4" /></Button>
                    </TooltipTrigger><TooltipContent>Vista de Cuadrícula</TooltipContent></Tooltip></TooltipProvider>
                </div>

                <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4" /> Añadir Producto</Button>
            </div>

            {/* Acciones en lote y reseteo de filtros */}
            {(selection.selectedIds.size > 0 || filters.activeFilterCount > 0) && (
                <div className="flex items-center justify-between h-9">
                    {selection.selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{selection.selectedIds.size} seleccionado(s)</span>
                            <Button variant="destructive" size="sm" disabled><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
                        </div>
                    ) : <div />}

                    {filters.activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={filters.clearFilters}>
                            <X className="mr-1 h-3 w-3" /> Limpiar {filters.activeFilterCount} filtro(s)
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}