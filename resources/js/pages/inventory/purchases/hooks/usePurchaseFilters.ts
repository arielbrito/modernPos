// resources/js/pages/inventory/purchases/hooks/usePurchaseFilters.ts
import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';

export type EmailFilter = 'all' | 'sent' | 'queued' | 'failed' | 'never';

export interface PurchaseFilters {
    search?: string;
    status?: string; // 'all' | 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled' ...
    email?: EmailFilter;
}

type ResolvedFilters = {
    search: string;
    status: string;
    email: EmailFilter;
};

const normalize = (f?: PurchaseFilters): ResolvedFilters => ({
    search: (f?.search ?? '').trim(),
    status: f?.status ?? 'all',
    email: f?.email ?? 'all',
});

export function usePurchaseFilters(initial: PurchaseFilters) {
    const [filters, setFilters] = React.useState<ResolvedFilters>(() => normalize(initial));

    // Enviar al servidor con debounce
    const debouncedSubmit = useDebouncedCallback((newFilters: ResolvedFilters) => {
        router.get(PurchaseController.index.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, 300);

    const handleFilterChange = <K extends keyof PurchaseFilters>(key: K, value: NonNullable<PurchaseFilters[K]> extends string ? string : any) => {
        const newFilters = normalize({ ...filters, [key]: value as any });
        setFilters(newFilters);
        debouncedSubmit(newFilters);
    };

    const clearFilters = () => {
        const cleared = normalize({ search: '', status: 'all', email: 'all' });
        setFilters(cleared);
        // Limpieza inmediata
        router.get(PurchaseController.index.url(), cleared, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return { filters, handleFilterChange, clearFilters };
}
