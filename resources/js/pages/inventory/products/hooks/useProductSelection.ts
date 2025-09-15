import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseProductSelectionResult {
    selectedIds: Set<number>;
    toggle: (productId: number) => void;
    toggleAll: () => void;
    areAllSelected: boolean;
    reset: () => void;
}

/**
 * Hook para gestionar la selección de items (productos) en una lista.
 * @param allItemIds - Un array con los IDs de todos los items actualmente visibles.
 */
export function useProductSelection(allItemIds: number[] = []): UseProductSelectionResult {
    const [selectedIds, setSelectedIds] = useState(new Set<number>());

    // Resetea la selección si la lista de productos cambia (ej: paginación)
    useEffect(() => {
        setSelectedIds(new Set());
    }, [allItemIds]);

    const toggle = useCallback((productId: number) => {
        setSelectedIds((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    }, []);

    const areAllSelected = useMemo(() => allItemIds.length > 0 && selectedIds.size === allItemIds.length, [selectedIds, allItemIds]);

    const toggleAll = useCallback(() => {
        if (areAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allItemIds));
        }
    }, [areAllSelected, allItemIds]);

    const reset = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    return { selectedIds, toggle, toggleAll, areAllSelected, reset };
}
