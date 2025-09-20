import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import type { Report } from './types/shift-types';

// --- HELPERS (los mismos que en el reporte principal) ---
const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));
const formatDate = (dateStr?: string | null) => dateStr ? new Date(dateStr).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// --- SUB-COMPONENTES PARA EL REPORTE ---
const ReportHeader = ({ shift }: { shift: Report['shift'] }) => (
    <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">{shift.store.name}</h1>
        <p className="text-lg font-semibold text-gray-700">Reporte de Cierre de Turno #{shift.id}</p>
        <p className="text-sm text-gray-500">Caja: {shift.register.name}</p>
        <p className="text-sm text-gray-500">
            Desde {formatDate(shift.opened_at)} hasta {formatDate(shift.closed_at)}
        </p>
    </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-3">{title}</h2>
        {children}
    </section>
);

const SummarySection = ({ summary }: { summary: Report['summary'] }) => {
    const summaryByCurrency = Object.entries(summary.by_currency).map(([ccy, data]) => ({ currency_code: ccy, ...data }));
    return (
        <section>
            <h2 className="text-lg font-bold border-b pb-2 mb-2">Resumen Financiero</h2>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left font-semibold">
                        <th className="py-1">Moneda</th>
                        <th className="py-1 text-right">Esperado</th>
                        <th className="py-1 text-right">Contado</th>
                        <th className="py-1 text-right">Variación</th>
                    </tr>
                </thead>
                <tbody>
                    {summaryByCurrency.map(item => (
                        <tr key={item.currency_code}>
                            <td className="py-1">{item.currency_code}</td>
                            <td className="py-1 text-right">{money(item.expected, item.currency_code)}</td>
                            <td className="py-1 text-right">{money(item.counted, item.currency_code)}</td>
                            <td className={`py-1 text-right font-semibold ${item.variance !== 0 ? 'text-red-600' : ''}`}>
                                {money(item.variance, item.currency_code)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="font-bold border-t-2">
                    <tr>
                        <td className="py-2">Total General ({summaryByCurrency[0]?.currency_code || 'DOP'})</td>
                        <td className="py-2 text-right">{money(summary.totals.expected, summaryByCurrency[0]?.currency_code)}</td>
                        <td className="py-2 text-right">{money(summary.totals.counted, summaryByCurrency[0]?.currency_code)}</td>
                        <td className={`py-2 text-right ${summary.totals.variance !== 0 ? 'text-red-600' : ''}`}>
                            {money(summary.totals.variance, summaryByCurrency[0]?.currency_code)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </section>
    );
};

// --- NUEVO COMPONENTE PARA PAGOS ---
const PaymentsSection = ({ payments }: { payments: Report['payments'] }) => {
    if (!payments?.rows?.length) return null;
    return (
        <Section title="Detalle de Pagos por Método">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left font-semibold border-b">
                        <th className="py-1">Método</th>
                        <th className="py-1">Moneda</th>
                        <th className="py-1 text-right"># Pagos</th>
                        <th className="py-1 text-right">Monto Total</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.rows.map((row, index) => (
                        <tr key={index} className="border-b">
                            <td className="py-1 capitalize">{row.method}</td>
                            <td className="py-1">{row.currency_code}</td>
                            <td className="py-1 text-right">{row.count}</td>
                            <td className="py-1 text-right">{money(Number(row.amount), row.currency_code)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
};

// --- NUEVO COMPONENTE PARA CONTEOS ---
const CountsSection = ({ counts }: { counts: Report['counts'] }) => {
    const renderCountDetail = (title: string, data: Report['counts']['opening']) => {
        if (!data) return null;
        return (
            <div>
                <h3 className="font-bold text-md mb-2">{title}</h3>
                {Object.entries(data.by_currency).map(([ccy, currencyData]) => (
                    <div key={ccy} className="mb-3">
                        <div className="flex justify-between font-semibold bg-gray-100 p-2 rounded-t-md">
                            <span>Moneda: {ccy}</span>
                            <span>{money(currencyData.total, ccy)}</span>
                        </div>
                        <table className="w-full text-xs border">
                            <tbody>
                                {currencyData.lines.filter(l => l.qty > 0).map((line, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="p-1">{`${line.kind === "bill" ? "Billete" : "Moneda"} de ${money(line.denomination, ccy)}`}</td>
                                        <td className="p-1 text-right">{line.qty}</td>
                                        <td className="p-1 text-right">{money(line.subtotal, ccy)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Section title="Desglose de Conteo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderCountDetail('Conteo de Apertura', counts.opening)}
                {renderCountDetail('Conteo de Cierre', counts.closing)}
            </div>
        </Section>
    );
};


// --- COMPONENTE PRINCIPAL DE IMPRESIÓN ---
export default function ShiftReportPrint({ report }: { report: Report }) {
    // Activa el diálogo de impresión automáticamente al cargar la página
    useEffect(() => {
        // Un pequeño retraso para asegurar que las imágenes y fuentes carguen antes de imprimir
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={`Imprimir Reporte #${report.shift.id}`} />
            {/* `font-sans` para un look más moderno y legible que el `font-serif` por defecto */}
            <main className="max-w-2xl mx-auto p-8 bg-white font-sans text-gray-900">
                <ReportHeader shift={report.shift} />

                <div className="space-y-8">
                    <SummarySection summary={report.summary} />
                    <PaymentsSection payments={report.payments} />
                    <CountsSection counts={report.counts} />
                </div>

                <footer className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                    Generado por CashFlow el {formatDate(new Date().toISOString())}
                </footer>
            </main>
        </>
    );
}