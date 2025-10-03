import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import PurchaseController from '@/actions/App/Http/Controllers/Inventory/PurchaseController';
import type { BreadcrumbItem, Purchase } from '@/types';
import { toNum } from '@/utils/inventory';

export function usePurchaseDetails(purchase: Purchase) {
    // Breadcrumbs
    const breadcrumbs = useMemo<BreadcrumbItem[]>(
        () => [
            { title: 'Compras', href: PurchaseController.index.url() },
            { title: purchase.code, href: PurchaseController.show.url({ purchase: purchase.id }) },
        ],
        [purchase.id, purchase.code],
    );

    // Mapa de pendientes por purchase_item_id
    const pendingItemsMap = useMemo<Record<number, number>>(() => {
        const map: Record<number, number> = {};
        for (const item of purchase.items) {
            const ordered = toNum(item.qty_ordered);
            const received = toNum(item.qty_received);
            const pending = Math.max(0, ordered - received);
            if (pending > 0) map[item.id] = pending;
        }
        return map;
    }, [purchase.items]);

    // Lista de pendientes para mostrar (nombre + qty)
    const pendingItemsList = useMemo(
        () =>
            purchase.items
                .map((item) => ({
                    id: item.id,
                    name: `${item.product_variant.product.name} (SKU: ${item.product_variant.sku})`,
                    pending: pendingItemsMap[item.id] ?? 0,
                }))
                .filter((x) => x.pending > 0),
        [purchase.items, pendingItemsMap],
    );

    // Permisos/acciones disponibles derivadas del estado
    const permissions = useMemo(
        () => ({
            canBeApproved: purchase.status === 'draft',
            canBeCancelled: !['received', 'partially_received', 'cancelled'].includes(purchase.status),
            canReceiveItems: ['approved', 'partially_received'].includes(purchase.status) && pendingItemsList.length > 0,
            canMakePayment: toNum(purchase.balance_total) > 0 && ['partially_received', 'received'].includes(purchase.status),
        }),
        [purchase.status, purchase.balance_total, pendingItemsList.length],
    );

    // Helper para acciones POST simples
    const performAction = useCallback((url: string, messages: { success: string; error: string }) => {
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
    }, []);

    // Acciones
    const approve = useCallback(
        () =>
            performAction(PurchaseController.approve.url({ purchase: purchase.id }), {
                success: `Compra ${purchase.code} aprobada.`,
                error: 'Error al aprobar la compra.',
            }),
        [performAction, purchase.id, purchase.code],
    );

    const cancel = useCallback(
        () =>
            performAction(PurchaseController.cancel.url({ purchase: purchase.id }), {
                success: `Compra ${purchase.code} cancelada.`,
                error: 'Error al cancelar la compra.',
            }),
        [performAction, purchase.id, purchase.code],
    );

    const receiveAll = useCallback(() => {
        // Normaliza solo ítems con cantidad > 0
        const itemsPayload: Record<number, number> = {};
        for (const [key, val] of Object.entries(pendingItemsMap)) {
            const qty = Math.max(0, toNum(val));
            if (qty > 0) itemsPayload[Number(key)] = qty;
        }

        if (Object.keys(itemsPayload).length === 0) {
            toast.info('No hay ítems pendientes por recibir.');
            return;
        }

        router.post(
            PurchaseController.receive.url({ purchase: purchase.id }),
            { items: itemsPayload },
            {
                onSuccess: () => toast.success('Se recibió todo lo pendiente.'),
                onError: () => toast.error('No se pudo registrar la recepción.'),
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, [pendingItemsMap, purchase.id]);

    const actions = { approve, cancel, receiveAll };

    return { breadcrumbs, pendingItemsList, pendingItemsMap, permissions, actions };
}
