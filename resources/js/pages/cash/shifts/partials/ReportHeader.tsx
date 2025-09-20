import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { Shift } from '@/types'; // Asegúrate que la ruta a tus tipos sea correcta
import CashShiftReportController from '@/actions/App/Http/Controllers/Cash/CashShiftReportController';

// Helper para formatear fechas de manera consistente
const formatDate = (dateStr?: string | null) =>
    dateStr ? new Date(dateStr).toLocaleString('es-DO', {
        dateStyle: 'short',
        timeStyle: 'short'
    }) : '—';

interface ReportHeaderProps {
    shift: Shift;
}

export function ReportHeader({ shift }: ReportHeaderProps) {
    const exportUrl = CashShiftReportController.export.url({ shift: Number(shift.id) });
    const printUrl = CashShiftReportController.print.url({ shift: shift.id });

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-200">
                    Reporte de Cierre de Turno #{shift.id}
                </h1>
                <p className="text-muted-foreground">
                    Caja: {shift.register.name} ({shift.store.name})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(shift.opened_at)} – {formatDate(shift.closed_at)}
                </p>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
                <Button variant="outline" asChild>
                    <a href={exportUrl}>
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </a>
                </Button>
                <Button onClick={() => window.open(printUrl, '_blank')}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
            </div>
        </div>
    );
}