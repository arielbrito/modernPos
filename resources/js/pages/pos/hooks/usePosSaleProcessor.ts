/* eslint-disable @typescript-eslint/no-unused-vars */
import SaleController from '@/actions/App/Http/Controllers/Sales/SaleController';
import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { isTruthy, onlyDigits } from '../libs/pos-helpers';
import { PosContext, PosCustomer, SalePayload } from '../libs/pos-types';
import { type UIPayment } from '../partials/paymentDialog';
import { UsePosCartResult } from './usePosCart';

interface UsePosSaleProcessorProps {
    context: PosContext;
    cart: UsePosCartResult;
    customer: PosCustomer | null;
    ncfInfo: { type: 'B01' | 'B02'; preview: string | null };
    onSuccess: () => void;
}

export function usePosSaleProcessor({ context, cart, customer, ncfInfo, onSuccess }: UsePosSaleProcessorProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const processPaidSale = useCallback(
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
            submit(payload);

            // setIsProcessing(true);
            // router.post(SaleController.store.url(), payload, {
            //     preserveScroll: true,
            //     onSuccess: () => {
            //         onSuccess(); // Llama al callback de éxito para limpiar el estado
            //     },
            //     onError: (errors) => {
            //         console.error('Error al procesar la venta:', errors);
            //         const errorMessages = Object.values(errors).join('\n');
            //         toast.error(`Error al procesar la venta: ${errorMessages}`);
            //     },
            //     onFinish: () => setIsProcessing(false),
            // });
        },
        [context, cart, customer, ncfInfo, onSuccess],
    );

    const processCreditSale = useCallback(() => {
        if (!customer) {
            toast.error('Se requiere un cliente para ventas a crédito.');
            return;
        }
        if (!customer.allow_credit) {
            toast.error(`El cliente ${customer.name} no tiene crédito habilitado.`);
            return;
        }

        // Creamos un payload especial para la venta a crédito
        const creditPayments: UIPayment[] = [
            {
                method: 'credit',
                amount: cart.totals.total,
                currency_code: 'DOP', // O la moneda principal de la venta
            },
        ];

        const payload = buildSalePayload({ context, cart, customer, ncfInfo, payments: creditPayments });
        console.log('payload de venta a crédito:', payload);
        submit(payload);
    }, [context, cart, customer, ncfInfo, onSuccess]);

    const submit = (payload: SalePayload) => {
        setIsProcessing(true);
        router.post(SaleController.store.url(), payload, {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess(); // Limpia el TPV
            },
            onError: (errors) => {
                console.error('Error al procesar la venta:', errors);
                const errorMessages = Object.values(errors).join('\n');
                toast.error(`Error al procesar la venta: ${errorMessages}`);
                console.log('errorMessages:', errorMessages);
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    return { isProcessing, processPaidSale, processCreditSale };
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
        lines: cart.items.map((item) => {
            const meta = cart.lineMeta[item.product_variant_id] || {};
            return {
                variant_id: item.product_variant_id,
                qty: item.quantity,
                unit_price: item.price,

                // Añadimos explícitamente los campos de impuestos
                // Si no hay `tax_code`, ambos serán undefined y no se enviarán.
                tax_code: meta.tax_code,
                tax_rate: meta.tax_rate,

                // Añadimos descuentos solo si tienen un valor, para no enviar campos vacíos
                ...(meta.discount_amount && { discount_amount: meta.discount_amount }),
                ...(meta.discount_percent && { discount_percent: meta.discount_percent }),
            };
        }),
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
