import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { toast } from 'sonner';

type LoadingStates = {
    approving: number | null;
    cancelling: number | null;
};

function extractErrorMessage(errors: unknown): string {
    // Inertia suele enviar un objeto { field: string | string[] }
    if (typeof errors === 'string') return errors;
    if (Array.isArray(errors)) return errors.join(', ');
    if (errors && typeof errors === 'object') {
        const arr = Object.values(errors as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : [v]));
        return arr
            .map((x) => String(x ?? ''))
            .filter(Boolean)
            .join(', ');
    }
    return 'Ha ocurrido un error.';
}

export function usePurchaseActions() {
    const [loadingStates, setLoadingStates] = React.useState<LoadingStates>({
        approving: null,
        cancelling: null,
    });

    const isApproving = React.useCallback((id: number) => loadingStates.approving === id, [loadingStates.approving]);

    const isCancelling = React.useCallback((id: number) => loadingStates.cancelling === id, [loadingStates.cancelling]);

    const approvePurchase = React.useCallback(
        (id: number) => {
            // evita doble click por fila
            if (isApproving(id)) return;

            setLoadingStates((prev) => ({ ...prev, approving: id }));

            router.post(
                PurchaseController.approve.url({ purchase: id }),
                {},
                {
                    onSuccess: () => toast.success('Compra aprobada con éxito.'),
                    onError: (errors) => {
                        toast.error(extractErrorMessage(errors) || 'No se pudo aprobar la compra.');
                    },
                    onFinish: () => setLoadingStates((prev) => ({ ...prev, approving: null })),
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        },
        [isApproving],
    );

    const cancelPurchase = React.useCallback(
        (id: number) => {
            // evita doble click por fila
            if (isCancelling(id)) return;

            setLoadingStates((prev) => ({ ...prev, cancelling: id }));

            router.post(
                PurchaseController.cancel.url({ purchase: id }),
                {},
                {
                    onSuccess: () => toast.success('Compra cancelada correctamente.'),
                    onError: (errors) => {
                        toast.error(extractErrorMessage(errors) || 'No se pudo cancelar la compra.');
                    },
                    onFinish: () => setLoadingStates((prev) => ({ ...prev, cancelling: null })),
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        },
        [isCancelling],
    );

    return {
        approvePurchase,
        cancelPurchase,
        loadingStates,
        isApproving,
        isCancelling,
    };
}
