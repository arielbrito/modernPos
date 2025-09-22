/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';

// Componentes de la UI del POS
// import { PosHeader } from './partials/pos-header';
import { ProductSearch } from './partials/product-search';
import { ProductGrid } from './partials/product-grid';
import { CartPanel } from './partials/cart-panel';
import { PaymentDialog } from './partials/paymentDialog';

// Hooks de lógica del POS
import { usePosContext } from './hooks/usePosContext';
import { useProductSearch } from './hooks/useProductSearch';
import { usePosCart } from './hooks/usePosCart';
import { usePosSaleProcessor } from './hooks/usePosSaleProcessor';

// Tipos
import { CustomerLite } from './partials/customer-quick-pick';
import { type UIPayment } from './partials/paymentDialog';

export default function PosPage() {
    const { flash, pos }: any = usePage().props;

    // --- 1. Inicialización de Hooks ---
    const context = usePosContext();
    const search = useProductSearch();
    const cart = usePosCart();

    // --- 2. Estado específico de la UI ---
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [customer, setCustomer] = useState<CustomerLite | null>(null);
    const [ncfInfo, setNcfInfo] = useState<{ type: "B01" | "B02"; preview: string | null }>({ type: "B02", preview: null });

    const handleNcfChange = useCallback((type: 'B01' | 'B02', preview: string | null) => {
        setNcfInfo({ type, preview });
    }, []);

    // --- 3. Hook de Procesamiento (depende de otros hooks y estado) ---
    const { isProcessing, processSale } = usePosSaleProcessor({
        context,
        cart,
        customer,
        ncfInfo,
        onSuccess: () => {
            cart.clearCart();
            setIsPaymentModalOpen(false);
            setCustomer(null);
            setNcfInfo({ type: "B02", preview: null });
            search.setQuery('');
        },
    });

    // --- 4. Efectos para notificaciones y limpieza ---
    useEffect(() => {
        if (pos?.last_sale) {
            toast.success(`Venta ${pos.last_sale.number} completada.`);
            window.open(`/sales/${pos.last_sale.id}/print`, '_blank');
        }
    }, [pos?.last_sale]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);


    // --- 5. Renderizado del Layout y Componentes ---
    return (
        <AppLayout>
            <Head title="Punto de Venta" />
            <div className="h-screen flex flex-col  bg-background overflow-hidden">
                {/* PosHeader ha sido eliminado */}

                <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 p-6 overflow-hidden min-h-0">
                    {/* Columna de Productos */}
                    <div className="flex flex-col gap-4 h-full overflow-hidden">
                        <ProductSearch
                            query={search.query}
                            onQueryChange={search.setQuery}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            customer={customer}
                            onCustomerChange={setCustomer}
                            activeStoreId={context.storeId}
                            ncfInfo={ncfInfo}
                            onNcfChange={handleNcfChange}
                        />
                        <div className="flex-1 rounded-lg overflow-hidden ">
                            <ProductGrid
                                products={search.results}
                                isLoading={search.isLoading}
                                viewMode={viewMode}
                                onProductClick={cart.addToCart}
                                searchQuery={search.query}
                            />
                        </div>
                    </div>

                    {/* Columna del Carrito */}
                    <div className=" lg:block min-h-0">
                        <CartPanel
                            items={cart.items}
                            totals={cart.totals}
                            lineMeta={cart.lineMeta}
                            onUpdateQuantity={cart.updateQuantity}
                            onUpdateLineMeta={cart.updateLineMeta}
                            onClearCart={cart.clearCart}
                            onCheckout={() => setIsPaymentModalOpen(true)}
                            onHold={() => toast.info('Función no implementada.')}
                            isProcessing={isProcessing}
                        />
                    </div>
                </main>
            </div>

            <PaymentDialog
                isOpen={isPaymentModalOpen}
                setIsOpen={setIsPaymentModalOpen}
                total={cart.totals.total}
                saleCurrency="DOP"
                currencies={['DOP', 'USD', 'EUR']}
                defaultFx={{ USD: 59.5, EUR: 65 }}
                onSubmit={(payments: UIPayment[], change: number) => processSale(payments, change)}
                isProcessing={isProcessing}
            />
        </AppLayout>
    );
}