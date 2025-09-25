import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface Props {
    filters: { search: string; status: string; };
    onFilterChange: (key: 'search' | 'status', value: string) => void;
    onClearFilters: () => void;
}

export function SearchFilter({ filters, onFilterChange, onClearFilters }: Props) {
    const hasFilters = filters.search || filters.status !== 'all';

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código, proveedor..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
                    <SelectTrigger className="w-full sm:w-48">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder="Filtrar por estado" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="approved">Aprobado</SelectItem>
                        <SelectItem value="partially_received">Recepción Parcial</SelectItem>
                        <SelectItem value="received">Recibido</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                </Button>
            )}
        </div>
    );
}