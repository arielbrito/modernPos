import CashShiftController from '@/actions/App/Http/Controllers/Cash/CashShiftController';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { useCallback } from 'react';
import { toast } from 'sonner';

// Definimos la forma de los datos del formulario de filtros
interface ShiftFiltersForm {
    date_from: string;
    date_to: string;
    user_id: string;
    store_id: string;
}

/**
 * Hook para gestionar la lógica de filtrado en la página
 * del historial de cierres de turno.
 */
export function useShiftFilters(initialFilters: Partial<ShiftFiltersForm>) {
    const { data, setData, get, processing } = useForm<ShiftFiltersForm>({
        date_from: initialFilters.date_from || '',
        date_to: initialFilters.date_to || '',
        user_id: initialFilters.user_id || '',
        store_id: initialFilters.store_id || '',
    });

    const applyFilters = useCallback(() => {
        get(CashShiftController.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onError: () => toast.error('Hubo un problema al aplicar los filtros.'),
        });
    }, [get]);

    const clearFilters = useCallback(() => {
        // 1. Definimos el estado limpio
        const clearedState = {
            date_from: '',
            date_to: '',
            user_id: '',
            store_id: '',
        };

        // 2. Actualizamos el estado local
        setData(clearedState);

        // 3. Hacemos la petición GET con el estado ya limpio
        get(CashShiftController.index.url(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [get, setData]);

    // Función helper para manejar el cambio de fechas del DatePicker
    const handleDateChange = (field: 'date_from' | 'date_to', date: Date | undefined) => {
        setData(field, date ? format(date, 'yyyy-MM-dd') : '');
    };

    return {
        data,
        setData,
        processing,
        applyFilters,
        clearFilters,
        handleDateChange,
    };
}
