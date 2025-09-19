/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { CashCountPage } from './partials/CashCountPage'; // <-- Nuestro nuevo componente
import RegisterController from '@/actions/App/Http/Controllers/Cash/RegisterController';

export default function OpenShiftWrapperPage({ register, denominations, activeCurrency }: any) {
    const goBack = () => router.visit(RegisterController.cashbook.url({ register: register.id }));
    console.log({ register, denominations, activeCurrency });

    return (
        <AppLayout breadcrumbs={[
            { title: "Cajas", href: RegisterController.index.url() },
            { title: register.name, href: RegisterController.cashbook.url({ register: register.id }) },
            { title: "Abrir turno", href: "#" },
        ]}>
            <CashCountPage
                mode="open"
                registerId={register.id}
                denominations={denominations}
                activeCurrency={activeCurrency}
                onSuccess={goBack}
                onCancel={goBack}
            />
        </AppLayout>
    );
}