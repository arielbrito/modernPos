/* eslint-disable @typescript-eslint/no-unused-vars */
import SaleController from '@/actions/App/Http/Controllers/Sales/SaleController';
import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { compactLineMeta, isTruthy, onlyDigits } from '../libs/pos-helpers';
import { PosContext, PosCustomer, SalePayload } from '../libs/pos-types';
import { type UIPayment } from '../partials/paymentDialog';
import { UsePosCartResult } from './usePosCart';

interface UsePosSaleProcessorProps {
    context: PosContext;
    cart: UsePosCartResult;
    customer: PosCustomer;
    ncfInfo: { type: 'B01' | 'B02'; preview: string | null };
    onSuccess: () => void;
}

export function usePosSaleProcessor({ context, cart, customer, ncfInfo, onSuccess }: UsePosSaleProcessorProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const processSale = useCallback(
        (payments: UIPayment[], change: number) => {
            if (cart.items.length === 0) return;
            if (!context.storeId || !context.registerId || !context.shiftId) {
                toast.error('No hay tienda/caja/turno activos. Abre un turno de caja antes de cobrar.');
                router.visit('/cash/registers/select');
                return;
            }

            // Aquí podrías agregar la validación de pago vs. total si lo deseas
            // aunque el PaymentDialog ya lo pre-valida.

            const payload = buildSalePayload({ context, cart, customer, ncfInfo, payments });

            setIsProcessing(true);
            router.post(SaleController.store.url(), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess(); // Llama al callback de éxito para limpiar el estado
                },
                onError: (errors) => {
                    console.error('Error al procesar la venta:', errors);
                    const errorMessages = Object.values(errors).join('\n');
                    toast.error(`Error al procesar la venta: ${errorMessages}`);
                },
                onFinish: () => setIsProcessing(false),
            });
        },
        [context, cart, customer, ncfInfo, onSuccess],
    );

    return { isProcessing, processSale };
}

// Función interna para construir el payload
function buildSalePayload({
    context,
    cart,
    customer,
    ncfInfo,
    payments,
}: Omit<UsePosSaleProcessorProps, 'onSuccess'> & { payments: UIPayment[] }): SalePayload {
    const buyer = customer
        ? {
              source: customer.source,
              name: customer.name,
              document_type: customer.document_type,
              document_number: customer.document_number ?? null,
              is_taxpayer: customer.is_taxpayer ?? null,
              status: customer.status ?? null,
          }
        : { source: 'generic', name: 'Consumidor Final', document_type: 'NONE', document_number: null, is_taxpayer: false };

    return {
        store_id: context.storeId!,
        register_id: context.registerId!,
        shift_id: context.shiftId!,
        customer_id: customer?.source === 'customer' ? customer.id! : null,
        bill_to_name: buyer.name ?? 'Consumidor Final',
        bill_to_doc_type: (buyer.document_type as 'RNC' | 'CED' | 'NONE') ?? 'NONE',
        bill_to_doc_number: buyer.document_number ? onlyDigits(String(buyer.document_number)) : null,
        bill_to_is_taxpayer: isTruthy(buyer.is_taxpayer),
        currency_code: 'DOP',
        ncf_type: ncfInfo.type,
        occurred_at: new Date().toISOString(),
        lines: cart.items.map((ci) => ({
            variant_id: ci.product_variant_id,
            qty: ci.quantity,
            unit_price: ci.price,
            ...compactLineMeta(cart.lineMeta[ci.product_variant_id]),
        })),
        payments: payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
            currency_code: p.currency_code,
            fx_rate_to_sale: p.fx_rate_to_sale,
            reference: p.reference,
            tendered_amount: p.tendered_amount,
            change_amount: p.change_amount,
            change_currency_code: p.change_currency_code,
        })),
        meta: { buyer },
    };
}
