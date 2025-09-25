/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';

// Layout & Tipos
import AppLayout from '@/layouts/app-layout';
import { Register, Shift, ShiftSummary, Movement, PaymentsAggRow, Denomination, BreadcrumbItem } from '@/types';
import RegisterController from '@/actions/App/Http/Controllers/Cash/RegisterController';

// Hooks de Lógica
import { useCashbook } from './hooks/useCashbook';

// Componentes Parciales de UI
import { CashbookHeader } from './partials/CashbookHeader';
import { StatsGrid } from './partials/StatsGrid';
import { MovementsTable } from './partials/MovementsTable';
import { PaymentMethodsSummary } from './partials/PaymentMethodsSummary';
import { CashMovementModal } from './partials/cash-movement-modal';
import cash from '@/routes/cash';

// Props
interface CashbookShowProps {
    register: Register;
    shift: Shift | null;
    summary: ShiftSummary;
    incomes: Movement[];
    expenses: Movement[];
    denominations: Denomination[];
    currencies: string[];
    activeCurrency: string;
    can: { open: boolean; close: boolean; move: boolean; };
    flow: { payments_by_method: PaymentsAggRow[]; cash_in_active_currency: number, non_cash_in_sale_ccy: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Cajas", href: "" },
];

export default function CashbookShow(props: CashbookShowProps) {
    const { register, shift, summary, incomes, expenses, can, currencies, activeCurrency, flow } = props;

    // 1. Toda la lógica compleja ahora vive dentro de este hook.
    const {
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
    } = useCashbook(register.id);

    // 2. El componente principal ahora es un "orquestador" limpio.
    return (
        <AppLayout breadcrumbs={[...breadcrumbs, {
            title: register.name,
            href: ''
        }]}>
            <Head title={`Libro de Caja – ${register.name}`} />

            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
                <CashbookHeader
                    register={register}
                    shift={shift}
                    can={can}
                    currencies={currencies}
                    activeCurrency={activeCurrency}
                    isRefreshing={isRefreshing}
                    onCurrencyChange={handleCurrencyChange}
                    onRefresh={handleRefresh}
                    onOpenMovementModal={openMovementModal}
                />

                <StatsGrid
                    summary={summary}
                    currency={activeCurrency}
                    isRefreshing={isRefreshing}
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-6 space-y-6">
                        <PaymentMethodsSummary
                            flow={flow}
                            currency={activeCurrency}
                            shift={shift}
                        />
                    </div>
                    <div className="lg:col-span-6 space-y-6 lg:grid-cols-2 lg:gap-6 lg:grid">
                        <MovementsTable
                            title="Ingresos"
                            movements={incomes}
                            currency={activeCurrency}
                            isRefreshing={isRefreshing}
                            accentColor="green"
                            searchValue={searchIncome}
                            onSearchChange={setSearchIncome}
                        />
                        <MovementsTable
                            title="Egresos"
                            movements={expenses}
                            currency={activeCurrency}
                            isRefreshing={isRefreshing}
                            accentColor="red"
                            searchValue={searchExpense}
                            onSearchChange={setSearchExpense}
                        />
                    </div>

                </div>
            </div>

            {/* Los modales se mantienen aquí, controlados por el estado del hook */}
            {shift && (
                <CashMovementModal
                    open={movementModal.isOpen}
                    setOpen={closeMovementModal}
                    shiftId={shift.id}
                    currency={activeCurrency}
                    direction={movementModal.type}
                    onSuccess={() => {
                        toast.success(`Movimiento registrado exitosamente.`);
                        handleRefresh();
                    }}
                />
            )}
        </AppLayout>
    );
}