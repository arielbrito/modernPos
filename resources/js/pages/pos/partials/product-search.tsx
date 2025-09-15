import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Grid3X3, List } from 'lucide-react';
import CustomerQuickPick, { type CustomerLite } from './customer-quick-pick'; // Asegúrate de que la ruta sea correcta

interface ProductSearchProps {
    query: string;
    onQueryChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;

    // Props para el selector de cliente
    customer: CustomerLite | null;
    onCustomerChange: (customer: CustomerLite | null) => void;
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
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Input de Búsqueda */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o escanear código..."
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            className="pl-10 pr-4 h-10 border-slate-300 focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Controles y Selector de Cliente */}
                    <div className="flex items-center gap-4">
                        <CustomerQuickPick
                            activeStoreId={activeStoreId}
                            value={customer}
                            onChange={onCustomerChange}
                            onNcfChange={onNcfChange}
                        />

                        {/* Badge de NCF */}
                        <div className="hidden md:flex items-center gap-2 text-sm">
                            <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700">
                                {ncfInfo.preview ? (
                                    <span>Próx. {ncfInfo.type}: {ncfInfo.preview}</span>
                                ) : (
                                    <span>NCF {ncfInfo.type}</span>
                                )}
                            </span>
                        </div>

                        {/* Toggle de Vista */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => onViewModeChange('grid')}
                                aria-label="Vista de cuadrícula"
                            >
                                <Grid3X3 className="w-5 h-5" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => onViewModeChange('list')}
                                aria-label="Vista de lista"
                            >
                                <List className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}