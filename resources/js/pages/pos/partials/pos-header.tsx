/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Store, Clock, Calculator, Receipt } from 'lucide-react';
import { formatTime, f2 } from '../libs/pos-helpers';
import { PosContext } from '../libs/pos-types';

interface PosHeaderProps {
    context: PosContext;
    total: number;
}

export function PosHeader({ context, total }: PosHeaderProps) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Actualiza cada minuto
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Store className="w-6 h-6 text-emerald-600" />
                            <span className="text-slate-800 dark:text-slate-200 font-bold text-lg">
                                {context.store?.name ?? 'Punto de Venta'}
                            </span>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{formatTime(currentTime)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.visit('/cash/cashbook')}>
                            <Calculator className="w-4 h-4 mr-2" />
                            Libro de Caja
                        </Button>
                        <div className="bg-slate-200 dark:bg-slate-700 w-px h-6 mx-2"></div>
                        <div className="text-right">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Total a Pagar</span>
                            <p className="font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                                ${f2(total)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}