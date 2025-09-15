import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { router } from "@inertiajs/react";
import { CloseShiftPage } from "./partials/close-shift-page";
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";
// import CashShiftController from "@/actions/App/Http/Controllers/Cash/CashShiftController";

type Denom = { id: number; value: number; kind: "bill" | "coin"; currency_code: string };

export default function Page({
    shift,
    register,
    denominations,
    expected,
    activeCurrency,
}: {
    shift: { id: string | number; register_id: number; opened_at: string };
    register: { id: number; name: string };
    denominations: Denom[];
    expected: Record<string, number>;
    activeCurrency: string;
}) {
    const backToCashbook = () =>
        router.visit(RegisterController.cashbook.url({ register: register.id }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Cajas", href: RegisterController.index.url() },
                { title: register.name, href: RegisterController.cashbook.url({ register: register.id }) },
                { title: "Cerrar turno", href: "#" },
            ]}
        >
            <CloseShiftPage
                shiftId={shift.id}
                registerId={register.id}
                denominations={denominations}
                expected={expected}
                activeCurrency={activeCurrency}
                onCancel={backToCashbook}
                onSuccess={backToCashbook}
            />
        </AppLayout>
    );
}
