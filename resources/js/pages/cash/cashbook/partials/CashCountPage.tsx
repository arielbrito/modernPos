/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

// Hooks, Componentes UI, Tipos, etc.
import { useCashCount } from '../hooks/useCashCount';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calculator, Save, ArrowLeft, Eye, EyeOff, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import type { Denomination } from '@/types';
import CashShiftController from '@/actions/App/Http/Controllers/Cash/CashShiftController';

// Componentes extraídos
import { DenominationCard } from './DenominationCard';
import { CurrencyTabButton } from './CurrencyTabButton';
import { CardHeader } from '@/components/ui/card';

// Helper de formato
const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

// --- PROPS ---
interface CashCountPageProps {
    mode: 'open' | 'close';
    registerId: number;
    shiftId?: number;
    denominations: Denomination[];
    activeCurrency: string;
    onSuccess: () => void;
    onCancel: () => void;
    expected?: Record<string, number>;
}

// --- COMPONENTE PRINCIPAL ---
export function CashCountPage({ mode, registerId, shiftId, denominations, activeCurrency, onSuccess, onCancel, expected = {} }: CashCountPageProps) {
    const {
        qty, note, setNote, hideZeros, setHideZeros, groups, currencies,
        activeTab, setActiveTab, totals, grandTotal,
        setQuantity, clearAll, buildPayload
    } = useCashCount({ denominations, initialCurrency: activeCurrency });

    const [isProcessing, setIsProcessing] = useState(false);

    if (mode === 'close' && !shiftId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-background">
                <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Error Crítico</h1>
                <p className="text-muted-foreground mt-2">
                    No se ha proporcionado un ID de turno para cerrar.
                </p>
                <Button onClick={onCancel} variant="outline" className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
            </div>
        );
    }

    // Configuración dinámica para 'abrir' o 'cerrar' turno
    const config = {
        open: {
            title: "Abrir Turno de Caja",
            description: "Registra el conteo inicial de efectivo por moneda y denominación.",
            submitUrl: CashShiftController.open.url({ register: registerId }),
            submitLabel: "Abrir Turno",
            payloadKey: 'opening',
        },
        close: {
            title: "Cerrar Turno de Caja",
            description: "Realiza el conteo final de efectivo para cerrar el turno.",
            submitUrl: CashShiftController.close.url({ shift: Number(shiftId!) }),
            submitLabel: "Cerrar Turno",
            payloadKey: 'closing',
        }
    }[mode];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const hasAnyAmount = Object.values(qty).some(q => q > 0);
        if (mode === 'open' && !hasAnyAmount) {
            toast.error("Debe ingresar al menos una cantidad para abrir el turno.");
            return;
        }

        setIsProcessing(true);
        const { counts, note } = buildPayload();

        const payload = {
            [config.payloadKey]: counts,
            note: note.trim(),
            register_id: registerId // <-- La clave de la solución
        };

        router.post(config.submitUrl, payload, {
            onSuccess: () => {
                toast.success(`Turno ${mode === 'open' ? 'abierto' : 'cerrado'} exitosamente`);
                onSuccess();
            },
            onError: (errors) => {
                const errorMessages = Object.values(errors).join(' ');
                toast.error(`Error al ${mode === 'open' ? 'abrir' : 'cerrar'} el turno.`, { description: errorMessages });
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-5 w-5" /></Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-3"><Calculator className="h-8 w-8 text-primary" /> {config.title}</h1>
                                <p className="text-muted-foreground mt-1">{config.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total General Contado</div>
                            <div className="text-3xl font-bold text-primary tabular-nums">{money(grandTotal, activeTab)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Currency tabs and controls */}
            <div className="border-b bg-muted/30">
                <div className="container mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex gap-3">
                        {currencies.map(ccy => (
                            <CurrencyTabButton
                                key={ccy} currency={ccy}
                                total={totals[ccy] || 0}
                                isActive={activeTab === ccy}
                                onClick={() => setActiveTab(ccy)}
                                expected={(expected?.[ccy] || 0)}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="hide-zeros" className="flex cursor-pointer items-center gap-3 text-sm"><Switch id="hide-zeros" checked={hideZeros} onCheckedChange={setHideZeros} />{hideZeros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Ocultar ceros</Label>
                        <Button type="button" variant="outline" onClick={clearAll}><RotateCcw className="h-4 w-4 mr-2" /> Limpiar todo</Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-6 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {currencies.map(ccy => (
                        <TabsContent key={ccy} value={ccy} className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
                                {(groups[ccy] ?? []).filter(d => hideZeros ? (qty[d.id] || 0) > 0 : true).map(d => (
                                    <DenominationCard key={d.id} denomination={d} quantity={qty[d.id] || 0} onQuantityChange={(newQty: number) => setQuantity(d.id, newQty)} />
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Footer */}
            <div className="border-t bg-background backdrop-blur-sm sticky bottom-0">
                <form onSubmit={handleSubmit} className="container mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    <div className="space-y-2">
                        <Label htmlFor="shift-note" className="font-medium">Nota adicional (opcional)</Label>
                        <Textarea id="shift-note" placeholder="Agregar comentarios..." rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <div className="flex flex-col justify-end">
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>{mode === 'close' ? 'Resumen Final del Turno' : 'Resumen Apertura del Turno'}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currencies.map(ccy => {
                                    const counted = totals[ccy] || 0;
                                    const exp = expected[ccy] || 0;
                                    const diff = counted - exp;

                                    return (
                                        <div key={ccy}>
                                            <div className="flex justify-between items-center font-medium">
                                                <span>Total Contado ({ccy})</span>
                                                <span className="tabular-nums text-lg">{money(counted, ccy)}</span>
                                            </div>
                                            {/* Mostrar Esperado y Diferencia solo en modo 'close' */}
                                            {mode === 'close' && (
                                                <div className="text-xs pl-2 space-y-1 mt-1">
                                                    <div className="flex justify-between items-center text-muted-foreground">
                                                        <span>Monto Esperado</span>
                                                        <span>{money(exp, ccy)}</span>
                                                    </div>
                                                    <div className={`flex justify-between items-center font-semibold ${diff === 0 ? '' : diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        <span>Diferencia</span>
                                                        <span>{money(diff, ccy)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex flex-col justify-end">
                        <div className="flex gap-4">
                            <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isProcessing} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Cancelar</Button>
                            <Button type="submit" size="lg" className="flex-1 min-w-[200px]" disabled={isProcessing || (mode === 'close' && !shiftId)}>
                                {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-5 w-5" /> {config.submitLabel}</>}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}