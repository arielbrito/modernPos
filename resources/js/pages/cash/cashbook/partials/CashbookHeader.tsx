/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import { Register, Shift } from '@/types';

// UI & Icons
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Building, Wallet, CheckCircle2, XCircle, User, Clock, Menu, RefreshCw, DoorOpen, ArrowDownCircle, ArrowUpCircle, DoorClosed, Printer } from 'lucide-react';

// Rutas
import RegisterController from '@/actions/App/Http/Controllers/Cash/RegisterController';
import CashShiftReportController from '@/actions/App/Http/Controllers/Cash/CashShiftReportController';

interface CashbookHeaderProps {
    register: Register;
    shift: Shift | null;
    can: { open: boolean; close: boolean; move: boolean; };
    currencies: string[];
    activeCurrency: string;
    isRefreshing: boolean;
    onCurrencyChange: (newCurrency: string) => void;
    onRefresh: () => void;
    onOpenMovementModal: (type: 'in' | 'out') => void;
}

export function CashbookHeader({
    register, shift, can, currencies, activeCurrency, isRefreshing,
    onCurrencyChange, onRefresh, onOpenMovementModal
}: CashbookHeaderProps) {

    const [showMobileActions, setShowMobileActions] = useState(false);

    const shiftStatusBadge = useMemo(() => {
        if (!shift) {
            return <Badge variant="outline" className="bg-background"><XCircle className="h-3 w-3 mr-1" /> Sin Turno</Badge>;
        }
        return shift.status === "open"
            ? <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Turno Abierto</Badge>
            : <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Turno Cerrado</Badge>;
    }, [shift]);

    return (
        <div className="relative overflow-hidden rounded-xl gradient-stoneretail text-white shadow-lg">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20px_20px,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[length:40px_40px]" />

            <div className="relative p-6 lg:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Building className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Libro de Caja</h1>
                                <div className="flex items-center gap-2 text-blue-100">
                                    <Wallet className="h-4 w-4" />
                                    <span className="text-xl">{register.name}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {shiftStatusBadge}
                            {shift?.opened_by && (
                                <div className="flex items-center gap-2 text-sm text-blue-100"><User className="h-4 w-4" /> Abierto por {shift.opened_by.name}</div>
                            )}
                            {shift?.opened_at && (
                                <div className="flex items-center gap-2 text-sm text-blue-100"><Clock className="h-4 w-4" /> {new Date(shift.opened_at).toLocaleString()}</div>
                            )}
                        </div>
                    </div>

                    {/* Botón de menú para móvil */}
                    <div className="sm:hidden self-end">
                        <Button variant="secondary" size="icon" onClick={() => setShowMobileActions(!showMobileActions)} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Acciones */}
                <div className={`${showMobileActions ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center pt-4 border-t border-white/20`}>
                    <Select value={activeCurrency} onValueChange={onCurrencyChange}>
                        <SelectTrigger className="w-full sm:w-[140px] bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="flex-grow" /> {/* Espaciador */}

                    {shift && shift.status === "open" && can.move && (
                        <>
                            <Button variant="secondary" className="gap-2 bg-green-400/20 text-green-50 hover:bg-green-400/30 justify-center" onClick={() => onOpenMovementModal('in')}>
                                <ArrowDownCircle className="h-4 w-4" /> Ingreso
                            </Button>
                            <Button variant="secondary" className="gap-2 bg-red-400/20 text-red-50 hover:bg-red-400/30 justify-center" onClick={() => onOpenMovementModal('out')}>
                                <ArrowUpCircle className="h-4 w-4" /> Salida
                            </Button>
                        </>
                    )}

                    {shift && shift.status === "open" && can.close && (
                        <Button className="gap-2 bg-amber-400 text-amber-950 hover:bg-amber-500 justify-center" onClick={() => router.visit(RegisterController.closeShiftForm.url({ shift: Number(shift.id) }))}>
                            <DoorClosed className="h-4 w-4" /> Cerrar Turno
                        </Button>
                    )}

                    {!shift && can.open && (
                        <Button className="gap-2 bg-white text-blue-700 hover:bg-white/90 justify-center" onClick={() => router.visit(RegisterController.openShiftForm.url({ register: register.id }))}>
                            <DoorOpen className="h-4 w-4" /> Abrir Turno
                        </Button>
                    )}

                    {shift && (
                        <Button variant="secondary" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 justify-center" asChild>
                            <a href={CashShiftReportController.show.url({ shift: Number(shift.id) })} target="_blank"><Printer className="h-4 w-4" /> Reporte</a>
                        </Button>
                    )}

                    <Button variant="secondary" size="icon" onClick={onRefresh} disabled={isRefreshing} className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0">
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>
        </div>
    );
}