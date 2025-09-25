import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import { router } from '@inertiajs/react';
import * as React from 'react';
import { toast } from 'sonner';

export function usePurchaseActions() {
    const [loadingStates, setLoadingStates] = React.useState<{
        approving: number | null;
        cancelling: number | null;
    }>({
        approving: null,
        cancelling: null,
    });

    const approvePurchase = React.useCallback((id: number) => {
        setLoadingStates((prev) => ({ ...prev, approving: id }));
        router.post(
            PurchaseController.approve.url({ purchase: id }),
            {},
            {
                onSuccess: () => toast.success('Compra aprobada con éxito.'),
                onError: (errors) => {
                    const message = Object.values(errors).flat().join(', ') || 'No se pudo aprobar la compra.';
                    toast.error(message);
                },
                onFinish: () => setLoadingStates((prev) => ({ ...prev, approving: null })),
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, []);

    const cancelPurchase = React.useCallback((id: number) => {
        setLoadingStates((prev) => ({ ...prev, cancelling: id }));
        router.post(
            PurchaseController.cancel.url({ purchase: id }),
            {},
            {
                onSuccess: () => toast.success('Compra cancelada correctamente.'),
                onError: (errors) => {
                    const message = Object.values(errors).flat().join(', ') || 'No se pudo cancelar la compra.';
                    toast.error(message);
                },
                onFinish: () => setLoadingStates((prev) => ({ ...prev, cancelling: null })),
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, []);

    return { approvePurchase, cancelPurchase, loadingStates };
}
