import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Grid3X3, List, Scan, User, FileText } from 'lucide-react';
import CustomerQuickPick from './customer-quick-pick';
import { Customer } from '@/types';

interface ProductSearchProps {
    query: string;
    onQueryChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;

    // Props para el selector de cliente
    customer: Customer | null;
    onCustomerChange: (customer: Customer | null) => void;
    activeStoreId: number | null;

    // Props para mostrar el NCF
    ncfInfo: { type: 'B01' | 'B02'; preview: string | null };
    onNcfChange: (type: 'B01' | 'B02', preview: string | null) => void;
}

export function ProductSearch({
    query,
    onQueryChange,
    viewMode,
    onViewModeChange,
    customer,
    onCustomerChange,
    activeStoreId,
    ncfInfo,
    onNcfChange,
}: ProductSearchProps) {
    return (
        <div className="bg-card border-2 border-border/50 rounded-2xl shadow-lg backdrop-blur-sm relative overflow-hidden">
            {/* Efecto de gradiente sutil */}
            <div className="absolute inset-0 gradient-stoneretail-light opacity-30"></div>
            <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail"></div>

            <div className="relative px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-6">
                    {/* Input de Búsqueda Mejorado */}
                    <div className="relative flex-1 max-w-none lg:max-w-md group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                            <Search className="text-muted-foreground group-focus-within:text-primary w-5 h-5 transition-colors duration-200" />
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                            <Scan className="text-muted-foreground/60 w-4 h-4" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Buscar productos o escanear código de barras..."
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            className="
                                pl-12 pr-12 h-12 text-base
                                pos-input pos-focus
                                border-2 border-border/60
                                rounded-xl
                                bg-background/80 backdrop-blur-sm
                                shadow-inner
                                placeholder:text-muted-foreground/60
                                focus:shadow-lg focus:shadow-primary/10
                                focus:border-primary/60
                                transition-all duration-300
                                hover:border-primary/30
                                hover:shadow-md
                            "
                        />

                        {/* Indicador de estado activo */}
                        {query && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                        )}
                    </div>

                    {/* Controles y Información */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 lg:flex-shrink-0">

                        {/* Selector de Cliente con Mejoras */}
                        <div className="relative group">
                            <div className="absolute -inset-1 gradient-stoneretail rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
                            <div className="relative bg-background/90 backdrop-blur-sm rounded-xl border-2 border-border/60 hover:border-primary/40 transition-all duration-200">
                                <CustomerQuickPick
                                    activeStoreId={activeStoreId}
                                    value={customer}
                                    onChange={onCustomerChange}
                                    onNcfChange={onNcfChange}
                                />
                            </div>
                        </div>

                        {/* Badge de NCF Mejorado */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-border/50 bg-accent/30 backdrop-blur-sm hover:bg-accent/50 transition-all duration-200 group">
                                <FileText className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-200" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground/80 leading-none">
                                        NCF {ncfInfo.type}
                                    </span>
                                    {ncfInfo.preview && (
                                        <span className="text-sm font-semibold text-foreground leading-none mt-0.5">
                                            {ncfInfo.preview}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Toggle de Vista Mejorado */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border-2 border-border/30 backdrop-blur-sm">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('grid')}
                                aria-label="Vista de cuadrícula"
                                className={`
                                    relative h-10 w-12 rounded-lg transition-all duration-300
                                    ${viewMode === 'grid'
                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                                        : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground hover:scale-105'
                                    }
                                `}
                            >
                                <Grid3X3 className="w-5 h-5" />
                                {viewMode === 'grid' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-foreground rounded-full"></div>
                                )}
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('list')}
                                aria-label="Vista de lista"
                                className={`
                                    relative h-10 w-12 rounded-lg transition-all duration-300
                                    ${viewMode === 'list'
                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                                        : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground hover:scale-105'
                                    }
                                `}
                            >
                                <List className="w-5 h-5" />
                                {viewMode === 'list' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-foreground rounded-full"></div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Información del Cliente (cuando está seleccionado) */}
                {customer && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <User className="w-4 h-4 text-primary" />
                                <span className="font-medium text-primary">
                                    {customer.name}
                                </span>
                                {customer.email && (
                                    <span className="text-muted-foreground">
                                        • {customer.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Indicador de carga/búsqueda activa */}
            {query && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary/30 animate-pulse">
                    <div className="h-full bg-primary animate-pulse"></div>
                </div>
            )}
        </div>
    );
}