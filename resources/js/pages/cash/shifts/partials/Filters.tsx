/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo, useCallback, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { X, Filter, Calendar, Users, Store as StoreIcon } from 'lucide-react';
import { useShiftFilters } from '../hooks/useShiftFilters';
import { User, Store } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Tipo genérico mejorado para las opciones del Select
type SelectOption = {
    id: number | string;
    name: string;
    disabled?: boolean;
    description?: string;
};

// Props del componente con opciones adicionales
interface FiltersProps {
    filters: ReturnType<typeof useShiftFilters>;
    users: SelectOption[];
    stores: SelectOption[];
    className?: string;
    showLabels?: boolean;
    compact?: boolean;
    onFiltersChange?: (filters: any) => void;
    dateRangePresets?: DateRangePreset[];
    maxDateRange?: number; // Máximo de días permitidos entre fechas
    showActiveFiltersCount?: boolean;
    responsive?: boolean;
}

// Tipo para presets de rangos de fecha
interface DateRangePreset {
    label: string;
    value: { from: Date; to: Date };
}

// Presets de fecha por defecto
const DEFAULT_DATE_PRESETS: DateRangePreset[] = [
    {
        label: 'Hoy',
        value: {
            from: new Date(),
            to: new Date()
        }
    },
    {
        label: 'Últimos 7 días',
        value: {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            to: new Date()
        }
    },
    {
        label: 'Últimos 30 días',
        value: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            to: new Date()
        }
    },
    {
        label: 'Este mes',
        value: {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            to: new Date()
        }
    }
];

// Componente memoizado para el contador de filtros activos
const ActiveFiltersCounter = memo(({ count }: { count: number }) => {
    if (count === 0) return null;

    return (
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
            {count}
        </span>
    );
});

ActiveFiltersCounter.displayName = 'ActiveFiltersCounter';

// Componente principal mejorado
export function Filters({
    filters,
    users,
    stores,
    className,
    showLabels = false,
    compact = false,
    onFiltersChange,
    dateRangePresets = DEFAULT_DATE_PRESETS,
    maxDateRange,
    showActiveFiltersCount = true,
    responsive = true
}: FiltersProps) {
    const { data, setData, clearFilters, processing } = filters;

    const handleDateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target as { name: 'date_from' | 'date_to'; value: string };

        // Lógica para auto-ajustar la otra fecha si es necesario
        if (name === 'date_from' && value && data.date_to && value > data.date_to) {
            setData({
                ...data,
                date_from: value,
                date_to: value // Ajusta la fecha 'hasta' para que sea igual
            });
        } else if (name === 'date_to' && value && data.date_from && value < data.date_from) {
            setData({
                ...data,
                date_from: value, // Ajusta la fecha 'desde' para que sea igual
                date_to: value
            });
        } else {
            setData(name, value);
        }

        onFiltersChange?.({ ...data, [name]: value });
    }, [data, setData, onFiltersChange]);

    // Función helper para parsear fechas de forma segura
    const parseDate = useCallback((dateString: string | undefined): Date | undefined => {
        if (!dateString) return undefined;
        try {
            const parsed = parseISO(dateString);
            return isValid(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }, []);

    // Validación de rango de fechas
    const validateDateRange = useCallback((from: Date | undefined, to: Date | undefined): boolean => {
        if (!from || !to || !maxDateRange) return true;

        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= maxDateRange;
    }, [maxDateRange]);

    // Manejador mejorado para cambios de fecha
    const handleDateChange = useCallback((field: 'date_from' | 'date_to', date: Date | undefined) => {
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

        // Validar rango si es necesario
        if (maxDateRange) {
            const fromDate = field === 'date_from' ? date : parseDate(data.date_from);
            const toDate = field === 'date_to' ? date : parseDate(data.date_to);

            if (!validateDateRange(fromDate, toDate)) {
                console.warn(`El rango de fechas excede el máximo de ${maxDateRange} días`);
                return;
            }
        }

        // Auto-ajustar la otra fecha si es necesario
        if (field === 'date_from' && date && data.date_to) {
            const toDate = parseDate(data.date_to);
            if (toDate && date > toDate) {
                setData('date_to', formattedDate);
            }
        } else if (field === 'date_to' && date && data.date_from) {
            const fromDate = parseDate(data.date_from);
            if (fromDate && date < fromDate) {
                setData('date_from', formattedDate);
            }
        }

        setData(field, formattedDate);
        onFiltersChange?.({ ...data, [field]: formattedDate });
    }, [data, setData, onFiltersChange, maxDateRange, parseDate, validateDateRange]);

    // Manejador para cambios en selects
    const handleSelectChange = useCallback((field: 'user_id' | 'store_id', value: string) => {
        const finalValue = value === 'all' ? '' : value;
        setData(field, finalValue);
        onFiltersChange?.({ ...data, [field]: finalValue });
    }, [data, setData, onFiltersChange]);

    // Aplicar preset de fecha
    const applyDatePreset = useCallback((preset: DateRangePreset) => {
        const fromFormatted = format(preset.value.from, 'yyyy-MM-dd');
        const toFormatted = format(preset.value.to, 'yyyy-MM-dd');

        setData(prev => ({
            ...prev,
            date_from: fromFormatted,
            date_to: toFormatted
        }));

        onFiltersChange?.({
            ...data,
            date_from: fromFormatted,
            date_to: toFormatted
        });
    }, [setData, data, onFiltersChange]);

    // Limpiar filtros mejorado
    const handleClearFilters = useCallback(() => {
        clearFilters();
        onFiltersChange?.({
            date_from: '',
            date_to: '',
            user_id: '',
            store_id: ''
        });
    }, [clearFilters, onFiltersChange]);

    // Calcular número de filtros activos
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (data.date_from) count++;
        if (data.date_to) count++;
        if (data.user_id && data.user_id !== 'all') count++;
        if (data.store_id && data.store_id !== 'all') count++;
        return count;
    }, [data]);

    // Determinar si hay filtros activos
    const hasActiveFilters = activeFiltersCount > 0;

    // Clases dinámicas basadas en props
    const containerClasses = cn(
        "flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border transition-all",
        {
            "flex-wrap": responsive,
            "p-3 gap-2": compact,
            "border-blue-200 dark:border-blue-800": hasActiveFilters,
        },
        className
    );

    const fieldWrapperClasses = cn(
        "space-y-1",
        { "min-w-[180px]": !compact, "min-w-[140px]": compact }
    );

    return (
        <div className={containerClasses} role="search" aria-label="Filtros de búsqueda">
            {/* Sección de fechas */}
            <div className="flex items-center gap-2">
                {showLabels && (
                    <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 mr-1" />
                        Periodo:
                    </div>
                )}

                <div className={fieldWrapperClasses}>
                    {showLabels && <label htmlFor="date_from" className="text-xs text-slate-500">Desde</label>}
                    <Input
                        type="date"
                        id="date_from"
                        name="date_from"
                        value={data.date_from || ''}
                        onChange={handleDateInputChange}
                        max={data.date_to || ''} // Restricción nativa
                        className={cn(compact ? "h-9" : "", "dark:[color-scheme:dark]")}
                    />
                </div>

                <div className={fieldWrapperClasses}>
                    {showLabels && <label htmlFor="date_to" className="text-xs text-slate-500">Hasta</label>}
                    <Input
                        type="date"
                        id="date_to"
                        name="date_to"
                        value={data.date_to || ''}
                        onChange={handleDateInputChange}
                        min={data.date_from || ''} // Restricción nativa
                        className={cn(compact ? "h-9" : "", "dark:[color-scheme:dark]")}
                    />
                </div>

                {/* Presets de fecha (opcional) */}
                {dateRangePresets.length > 0 && (
                    <Select onValueChange={(value) => {
                        const preset = dateRangePresets.find(p => p.label === value);
                        if (preset) applyDatePreset(preset);
                    }}>
                        <SelectTrigger className={cn("w-[140px]", compact && "h-9")}>
                            <SelectValue placeholder="Rápido..." />
                        </SelectTrigger>
                        <SelectContent>
                            {dateRangePresets.map((preset) => (
                                <SelectItem key={preset.label} value={preset.label}>
                                    {preset.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Sección de usuarios */}
            <div className={fieldWrapperClasses}>
                {showLabels && (
                    <label className="text-xs text-slate-500 flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        Cajero
                    </label>
                )}
                <Select
                    value={String(data.user_id || 'all')}
                    onValueChange={(v) => handleSelectChange('user_id', v)}
                    disabled={processing}
                >
                    <SelectTrigger className={compact ? "h-9" : ""}>
                        <SelectValue placeholder="Todos los Cajeros" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Cajeros</SelectItem>
                        {users.map(u => (
                            <SelectItem
                                key={u.id}
                                value={String(u.id)}
                                disabled={u.disabled}
                            >
                                <div>
                                    <div>{u.name}</div>
                                    {u.description && (
                                        <div className="text-xs text-slate-500">{u.description}</div>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Sección de tiendas */}
            <div className={fieldWrapperClasses}>
                {showLabels && (
                    <label className="text-xs text-slate-500 flex items-center">
                        <StoreIcon className="w-3 h-3 mr-1" />
                        Tienda
                    </label>
                )}
                <Select
                    value={String(data.store_id || 'all')}
                    onValueChange={(v) => handleSelectChange('store_id', v)}
                    disabled={processing}
                >
                    <SelectTrigger className={compact ? "h-9" : ""}>
                        <SelectValue placeholder="Todas las Tiendas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Tiendas</SelectItem>
                        {stores.map(s => (
                            <SelectItem
                                key={s.id}
                                value={String(s.id)}
                                disabled={s.disabled}
                            >
                                <div>
                                    <div>{s.name}</div>
                                    {s.description && (
                                        <div className="text-xs text-slate-500">{s.description}</div>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Botón de limpiar con contador */}
            <Button
                variant={hasActiveFilters ? "destructive" : "ghost"}
                onClick={handleClearFilters}
                disabled={processing || !hasActiveFilters}
                className={cn(
                    "relative",
                    compact && "h-9 px-3"
                )}
                aria-label={`Limpiar ${activeFiltersCount} filtros activos`}
            >
                <X className="mr-2 h-4 w-4" />
                Limpiar
                {showActiveFiltersCount && <ActiveFiltersCounter count={activeFiltersCount} />}
            </Button>

            {/* Indicador de procesamiento */}
            {processing && (
                <div className="flex items-center text-sm text-slate-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900 dark:border-slate-100 mr-2" />
                    Aplicando filtros...
                </div>
            )}
        </div>
    );
}

// Exportar también una versión compacta como componente separado
export const CompactFilters = memo((props: Omit<FiltersProps, 'compact'>) => {
    return <Filters {...props} compact={true} />;
});

CompactFilters.displayName = 'CompactFilters';