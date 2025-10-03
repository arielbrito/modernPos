import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';

export interface PurchaseFilters {
    search?: string;
    status?: string; // 'all' | 'draft' | 'approved' | 'received' | 'partially_received' | 'cancelled'...
}

const normalize = (f?: PurchaseFilters): Required<PurchaseFilters> => ({
    search: (f?.search ?? '').trim(),
    status: f?.status ?? 'all',
});

export function usePurchaseFilters(initial: PurchaseFilters) {
    const [filters, setFilters] = React.useState<Required<PurchaseFilters>>(() => normalize(initial));

    // Submit con debounce para no disparar una request por tecla
    const debouncedSubmit = useDebouncedCallback((newFilters: Required<PurchaseFilters>) => {
        router.get(PurchaseController.index.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, 300);

    const handleFilterChange = (key: keyof PurchaseFilters, value: string) => {
        const newFilters = normalize({ ...filters, [key]: value });
        setFilters(newFilters);
        debouncedSubmit(newFilters);
    };

    const clearFilters = () => {
        const cleared = normalize({ search: '', status: 'all' });
        setFilters(cleared);
        // Limpieza inmediata (sin debounce)
        router.get(PurchaseController.index.url(), cleared, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return { filters, handleFilterChange, clearFilters };
}
