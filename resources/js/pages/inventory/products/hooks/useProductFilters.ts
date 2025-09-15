/* eslint-disable @typescript-eslint/no-explicit-any */
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import { useForm } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortField = 'name' | 'price' | 'created_at' | 'updated_at';

export function useProductFilters(initialFilters: Record<string, any>) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchValue, setSearchValue] = useState(initialFilters.search || '');

    interface ProductFilters {
        search: string;
        category_id: string;
        supplier_id: string;
        sort_field: SortField;
        sort_direction: 'asc' | 'desc';
        only_active: boolean;
    }

    // --- 1. CAMBIO AQUÍ ---
    // Simplemente usamos `setData` directamente de useForm.
    const { data, setData, get, reset } = useForm<ProductFilters>({
        search: initialFilters.search || '',
        category_id: initialFilters.category_id || '',
        supplier_id: initialFilters.supplier_id || '',
        sort_field: (initialFilters.sort_field as SortField) || 'name',
        sort_direction: initialFilters.sort_direction || 'asc',
        only_active: initialFilters.only_active !== false,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== data.search) {
                setData('search', searchValue);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue, data.search, setData]);

    useEffect(() => {
        setIsProcessing(true);
        get(ProductController.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onFinish: () => setIsProcessing(false),
            onError: () => toast.error('Hubo un problema al aplicar los filtros.'),
        });
    }, [data.search, data.category_id, data.supplier_id, data.sort_field, data.sort_direction, data.only_active, get]);

    const handleSort = useCallback(
        (field: SortField) => {
            const newDirection = data.sort_field === field && data.sort_direction === 'asc' ? 'desc' : 'asc';
            setData('sort_field', field);
            setData('sort_direction', newDirection);
        },
        [data.sort_field, data.sort_direction, setData],
    ); // Ahora dependemos de `setData` de useForm

    const clearFilters = useCallback(() => {
        reset();
        setSearchValue('');
    }, [reset]);

    const activeFilterCount = useMemo(() => {
        return Object.entries(data).filter(([key, value]) => {
            if (['sort_field', 'sort_direction', 'only_active'].includes(key)) return false;
            return !!value;
        }).length;
    }, [data]);

    return {
        data,
        setData,
        searchValue,
        setSearchValue,
        isProcessing,
        handleSort,
        clearFilters,
        activeFilterCount,
    };
}
