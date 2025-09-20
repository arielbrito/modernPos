// En resources/js/Pages/Cash/Shifts/Report.tsx

import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Report } from './types/shift-types';

// Hooks y Componentes que creamos
import { useShiftReportData } from './hooks/useShiftReportData';
import { ReportHeader } from './partials/ReportHeader';
import { SummaryKpis } from './partials/SummaryKpis';
import { SummaryTable } from './partials/SummaryTable';
import { PaymentsTable } from './partials/PaymentsTable';
import { CountDetails } from './partials/CountDetails';

export default function ShiftReport({ report }: { report: Report }) {
    // 1. Toda la lógica de datos vive en el hook
    const {
        shift,
        summaryByCurrencyArray,
        openingCountDetails,
        closingCountDetails,
        paymentRows,
        salesCount,
        totals,
    } = useShiftReportData(report);

    // Estado de carga o si no hay datos
    if (!shift) {
        return <AppLayout><div>Cargando reporte...</div></AppLayout>;
    }

    // 2. El componente principal solo se encarga de orquestar la UI
    return (
        <AppLayout>
            <Head title={`Reporte de Turno #${shift.id}`} />
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">

                <ReportHeader shift={{ ...shift, status: shift.status as "open" | "closed" }} />

                <SummaryKpis
                    salesCount={salesCount}
                    expected={totals.expected}
                    counted={totals.counted}
                    variance={totals.variance}
                />

                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="summary">Resumen Financiero</TabsTrigger>
                        <TabsTrigger value="payments">Detalle de Pagos</TabsTrigger>
                        <TabsTrigger value="counts">Desglose de Conteo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-6">
                        <SummaryTable data={summaryByCurrencyArray} />
                    </TabsContent>

                    <TabsContent value="payments" className="mt-6">
                        <PaymentsTable data={paymentRows} />
                    </TabsContent>

                    <TabsContent value="counts" className="mt-6">
                        <CountDetails
                            openingData={openingCountDetails}
                            closingData={closingCountDetails}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}