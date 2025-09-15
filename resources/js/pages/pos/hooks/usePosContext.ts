/* eslint-disable @typescript-eslint/no-explicit-any */
import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { PosContext } from '../libs/pos-types';

/**
 * Hook para obtener y memoizar el contexto actual del TPV
 * (tienda activa, caja y turno) desde las props de Inertia.
 */
export function usePosContext(): PosContext {
    const { props } = usePage<any>();

    // Usamos useMemo para evitar recalcular estos valores en cada render,
    // a menos que las props relevantes cambien.
    const context = useMemo(() => {
        const activeStore = props?.active_store ?? null;
        const storeId = activeStore?.id ?? props?.context?.active_store_id ?? null;

        const activeRegister =
            props?.context?.active_register ?? (props?.context?.active_register_id ? { id: props.context.active_register_id } : null);
        const registerId = activeRegister?.id ?? null;

        const shiftId = props?.context?.active_shift_id ?? null;

        return {
            storeId,
            registerId,
            shiftId,
            store: activeStore,
        };
    }, [props?.active_store, props?.context]);

    return context;
}
