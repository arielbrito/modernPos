import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface PurchaseFilters {
    search: string;
    status: string;
}

export function usePurchaseFilters(initialFilters: PurchaseFilters) {
    const [filters, setFilters] = React.useState(initialFilters);

    // Creamos una función "debounced" para que la petición no se envíe en cada tecleo.
    const debouncedSubmit = useDebouncedCallback((newFilters: PurchaseFilters) => {
        router.get(PurchaseController.index(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, 300); // 300ms de retraso

    const handleFilterChange = (key: keyof PurchaseFilters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        debouncedSubmit(newFilters);
    };

    const clearFilters = () => {
        const clearedFilters = { search: '', status: 'all' };
        setFilters(clearedFilters);
        // Para limpiar, hacemos la petición inmediatamente.
        router.get(PurchaseController.index(), clearedFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return { filters, handleFilterChange, clearFilters };
}
