import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { router } from "@inertiajs/react";
import { OpenShiftPage } from "./open-shift-page"; // <- donde guardaste TU componente
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";

type Denomination = { id: number; value: number; kind: "bill" | "coin"; currency_code: string };

export default function Page({
    register,
    denominations,
    activeCurrency,
}: {
    register: { id: number; name: string };
    denominations: Denomination[];
    activeCurrency: string;
}) {
    const goBack = () =>
        router.visit(RegisterController.cashbook.url({ register: register.id }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Cajas", href: RegisterController.index.url() },
                { title: register.name, href: RegisterController.cashbook.url({ register: register.id }) },
                { title: "Abrir turno", href: "#" },
            ]}
        >
            <OpenShiftPage
                registerId={register.id}
                denominations={denominations}
                activeCurrency={activeCurrency}
                onSuccess={goBack}
                onCancel={goBack}
            />
        </AppLayout>
    );
}
