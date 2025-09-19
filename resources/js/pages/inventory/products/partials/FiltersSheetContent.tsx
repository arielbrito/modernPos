import React from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import { Category, Supplier } from '@/types';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SheetFooter, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface FiltersSheetContentProps {
    filters: ReturnType<typeof useProductFilters>;
    categories: Pick<Category, 'id' | 'name'>[];
    suppliers: Pick<Supplier, 'id' | 'name'>[];
    onApply: () => void; // Función para cerrar el panel
}

export function FiltersSheetContent({ filters, categories, suppliers, onApply }: FiltersSheetContentProps) {
    const { data, setData, clearFilters } = filters;

    return (
        <>
            <SheetHeader>
                <SheetTitle>Filtros Avanzados</SheetTitle>
                <SheetDescription>
                    Refina tu búsqueda de productos aplicando los siguientes filtros.
                </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
                <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={data.category_id} onValueChange={(v) => setData('category_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Select value={data.supplier_id} onValueChange={(v) => setData('supplier_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            {suppliers.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                    <Switch
                        id="only_active"
                        checked={data.only_active}
                        onCheckedChange={(checked) => setData('only_active', checked)}
                    />
                    <Label htmlFor="only_active">Mostrar solo productos activos</Label>
                </div>
            </div>

            <SheetFooter>
                <Button variant="outline" onClick={() => { clearFilters(); onApply(); }}>Limpiar</Button>
                <Button onClick={onApply}>Aplicar</Button>
            </SheetFooter>
        </>
    );
}