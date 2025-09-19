/* eslint-disable react-hooks/exhaustive-deps */
import RegisterController from '@/actions/App/Http/Controllers/Cash/RegisterController';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from './useDebounce'; // Importamos nuestro hook

/**
 * Hook para gestionar toda la lógica de la página del Libro de Caja (Cashbook).
 * @param registerId - El ID de la caja registradora activa.
 */
export function useCashbook(registerId: number) {
    // Estado para la carga general de la página
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Estado unificado para el modal de movimientos (más limpio)
    const [movementModal, setMovementModal] = useState<{
        isOpen: boolean;
        type: 'in' | 'out';
    }>({ isOpen: false, type: 'in' });

    // Estado para los inputs de búsqueda
    const [searchIncome, setSearchIncome] = useState('');
    const [searchExpense, setSearchExpense] = useState('');

    // Valores con debounce para la búsqueda
    const debouncedSearchIncome = useDebounce(searchIncome, 300);
    const debouncedSearchExpense = useDebounce(searchExpense, 300);

    // --- EFECTOS PARA BÚSQUEDA ---
    // Un solo efecto para manejar ambas búsquedas y evitar race conditions
    useEffect(() => {
        // No hacer nada si los valores no han cambiado realmente
        if (debouncedSearchIncome === searchIncome && debouncedSearchExpense === searchExpense) return;

        router.get(
            RegisterController.cashbook.url({ register: registerId }),
            {
                q_in: debouncedSearchIncome,
                q_out: debouncedSearchExpense,
            },
            {
                preserveState: true,
                replace: true,
                only: ['incomes', 'expenses'], // Pedimos solo los datos que cambian
            },
        );
    }, [debouncedSearchIncome, debouncedSearchExpense, registerId]);

    // --- HANDLERS (Funciones de Acción) ---

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.reload({
            only: ['shift', 'summary', 'incomes', 'expenses', 'flow'],
            onFinish: () => setIsRefreshing(false),
        });
    }, []);

    const handleCurrencyChange = useCallback(
        (newCurrency: string) => {
            router.get(RegisterController.cashbook.url({ register: registerId }), { ccy: newCurrency }, { preserveState: true, replace: true });
        },
        [registerId],
    );

    const openMovementModal = useCallback((type: 'in' | 'out') => {
        setMovementModal({ isOpen: true, type });
    }, []);

    const closeMovementModal = useCallback(() => {
        setMovementModal({ isOpen: false, type: 'in' });
    }, []);

    // Devolvemos un objeto con todo lo que el componente de UI necesitará
    return {
        isRefreshing,
        movementModal,
        openMovementModal,
        closeMovementModal,
        searchIncome,
        setSearchIncome,
        searchExpense,
        setSearchExpense,
        handleRefresh,
        handleCurrencyChange,
    };
}
