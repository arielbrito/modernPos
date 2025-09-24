import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import type { BreadcrumbItem, Purchase } from '@/types';
import { toNum } from '@/utils/inventory';
import { router } from '@inertiajs/react';
import { useMemo } from 'react';
import { toast } from 'sonner';

export function usePurchaseDetails(purchase: Purchase) {
    const breadcrumbs = useMemo<BreadcrumbItem[]>(
        () => [
            { title: 'Compras', href: PurchaseController.index.url() },
            { title: purchase.code, href: PurchaseController.show.url({ purchase: purchase.id }) },
        ],
        [purchase.id, purchase.code],
    );

    const pendingItemsMap = useMemo(() => {
        const map: Record<number, number> = {};
        purchase.items.forEach((item) => {
            const pending = Math.max(0, toNum(item.qty_ordered) - toNum(item.qty_received));
            if (pending > 0) map[item.id] = pending;
        });
        return map;
    }, [purchase.items]);

    const pendingItemsList = useMemo(
        () =>
            purchase.items
                .map((item) => ({
                    id: item.id,
                    name: `${item.product_variant.product.name} (SKU: ${item.product_variant.sku})`,
                    pending: pendingItemsMap[item.id] ?? 0,
                }))
                .filter((item) => item.pending > 0),
        [purchase.items, pendingItemsMap],
    );

    const permissions = useMemo(
        () => ({
            canBeApproved: purchase.status === 'draft',
            canBeCancelled: !['received', 'partially_received', 'cancelled'].includes(purchase.status),
            canReceiveItems: ['approved', 'partially_received'].includes(purchase.status) && pendingItemsList.length > 0,
            canMakePayment: toNum(purchase.balance_total) > 0 && ['partially_received', 'received'].includes(purchase.status),
        }),
        [purchase.status, purchase.balance_total, pendingItemsList.length],
    );

    const performAction = (url: string, messages: { success: string; error: string }) => {
        router.post(
            url,
            {},
            {
                onSuccess: () => toast.success(messages.success),
                onError: () => toast.error(messages.error),
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const actions = {
        approve: () =>
            performAction(PurchaseController.approve.url({ purchase: purchase.id }), {
                success: `Compra ${purchase.code} aprobada.`,
                error: 'Error al aprobar la compra.',
            }),
        cancel: () =>
            performAction(PurchaseController.cancel.url({ purchase: purchase.id }), {
                success: `Compra ${purchase.code} cancelada.`,
                error: 'Error al cancelar la compra.',
            }),
        receiveAll: () =>
            router.post(
                PurchaseController.receive.url({ purchase: purchase.id }),
                { items: pendingItemsMap },
                {
                    onSuccess: () => toast.success('Se recibió todo lo pendiente.'),
                    onError: () => toast.error('No se pudo registrar la recepción.'),
                    preserveState: true,
                    preserveScroll: true,
                },
            ),
    };

    return { breadcrumbs, pendingItemsList, pendingItemsMap, permissions, actions };
}
