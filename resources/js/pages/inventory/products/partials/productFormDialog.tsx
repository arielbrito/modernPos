/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { Category, Product, Supplier } from '@/types';

// Componentes UI de ShadCN
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, PlusCircle, Package, ReceiptText } from 'lucide-react';
import InputError from '@/components/input-error';

// Wayfinder para rutas
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';

// --- TIPOS Y HELPERS ---

interface ProductFormDialogProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    categories: Pick<Category, 'id' | 'name'>[];
    suppliers: Pick<Supplier, 'id' | 'name'>[];
    productToEdit?: Product | null;
}

type VariantFormData = {
    id?: number;
    sku: string;
    selling_price: string;
    cost_price: string;
    barcode: string;
    attributes: string;
    is_taxable: boolean;
    tax_code: string;
    tax_rate: number;
};

type ProductFormData = {
    name: string;
    description: string;
    product_nature: 'stockable' | 'service';
    category_id: string;
    supplier_id: string;
    unit: string;
    is_active: boolean;
    variants: VariantFormData[];
};

const attributesObjectToString = (attributes: Record<string, any> | null | undefined): string => {
    if (!attributes || Object.keys(attributes).length === 0) return '';
    return Object.entries(attributes).map(([k, v]) => `${k}:${v}`).join(', ');
};

const newEmptyVariant = (): VariantFormData => ({
    id: undefined,
    sku: '',
    selling_price: '',
    cost_price: '',
    barcode: '',
    attributes: '',
    is_taxable: true,
    tax_code: 'ITBIS18',
    tax_rate: 0.18,
});

// --- SUB-COMPONENTES DE FORMULARIO PARA REUTILIZACIÓN ---

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-2">
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 border-b pb-2">{title}</h3>
        <div className="pt-2 space-y-4">{children}</div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---

export function ProductFormDialog({ isOpen, setIsOpen, categories, suppliers, productToEdit }: ProductFormDialogProps) {
    const isEditing = !!productToEdit;

    const { data, setData, post, patch, errors, reset, processing, clearErrors } = useForm<ProductFormData>({
        name: '',
        description: '',
        product_nature: 'stockable',
        category_id: '',
        supplier_id: '',
        unit: 'Unidad',
        is_active: true,
        variants: [newEmptyVariant()],
    });

    const isStockable = data.product_nature === 'stockable';

    useEffect(() => {
        if (isOpen && productToEdit) {
            setData({
                name: productToEdit.name,
                description: productToEdit.description || '',
                product_nature: productToEdit.product_nature as 'stockable' | 'service',
                category_id: String(productToEdit.category_id || ''),
                supplier_id: String(productToEdit.supplier_id || ''),
                unit: productToEdit.unit || 'Unidad',
                is_active: productToEdit.is_active,
                variants: productToEdit.variants.map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    selling_price: String(v.selling_price ?? ''),
                    cost_price: String(v.cost_price ?? ''),
                    barcode: v.barcode ?? '',
                    attributes: attributesObjectToString(v.attributes),
                    is_taxable: v.is_taxable,
                    tax_code: v.tax_code || 'ITBIS18',
                    tax_rate: v.tax_rate || 0.18,
                })),
            });
        } else if (!isOpen) {
            reset();
        }
        clearErrors();
    }, [isOpen, productToEdit]);

    const handleVariantChange = useCallback((index: number, field: keyof VariantFormData, value: any) => {
        setData('variants', data.variants.map((variant, i) =>
            i === index ? { ...variant, [field]: value } : variant
        ));
    }, [data.variants]);

    const addVariant = () => setData('variants', [...data.variants, newEmptyVariant()]);

    const removeVariant = (index: number) => {
        if (data.variants.length > 1) {
            setData('variants', data.variants.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setIsOpen(false) };

        if (isEditing) {
            patch(ProductController.update.url({ product: productToEdit!.id }), options);
        } else {
            post(ProductController.store.url(), options);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                    <DialogDescription>Completa la información del {isStockable ? 'producto' : 'servicio'}.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 p-1 pr-6">
                    <Section title="Información General">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label className="font-semibold">Naturaleza</Label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <Button type="button" variant={isStockable ? 'secondary' : 'outline'} onClick={() => setData('product_nature', 'stockable')}>
                                        <Package className="w-4 h-4 mr-2" /> Producto Inventariable
                                    </Button>
                                    <Button type="button" variant={!isStockable ? 'secondary' : 'outline'} onClick={() => setData('product_nature', 'service')}>
                                        <ReceiptText className="w-4 h-4 mr-2" /> Servicio
                                    </Button>
                                </div>
                            </div>
                            <div><Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label><Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} /><InputError message={errors.name} /></div>
                            <div><Label htmlFor="category_id">Categoría</Label><Select value={data.category_id} onValueChange={v => setData('category_id', v)}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select><InputError message={errors.category_id} /></div>
                            {isStockable && (
                                <div><Label htmlFor="supplier_id">Proveedor <span className="text-red-500">*</span></Label><Select value={data.supplier_id} onValueChange={v => setData('supplier_id', v)}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select><InputError message={errors.supplier_id} /></div>
                            )}
                            <div><Label htmlFor="unit">Unidad de Medida</Label><Select value={data.unit} onValueChange={v => setData('unit', v)}><SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger><SelectContent>{['Unidad', 'Kg', 'g', 'L', 'm', 'cm', 'Caja', 'Paquete', 'Botella'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><InputError message={errors.unit} /></div>
                        </div>
                        <div><Label htmlFor="description">Descripción (Opcional)</Label><Textarea id="description" value={data.description} onChange={e => setData('description', e.target.value)} /><InputError message={errors.description} /></div>
                    </Section>

                    <Section title={isStockable ? 'Variantes y Precios' : 'Precio del Servicio'}>
                        {data.variants.map((variant, index) => (
                            <div key={index} className="space-y-4 p-4 border rounded-md relative bg-slate-50 dark:bg-slate-800/50">
                                {isStockable && data.variants.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeVariant(index)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                )}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {isStockable && (
                                        <div><Label htmlFor={`sku_${index}`}>SKU <span className="text-red-500">*</span></Label><Input id={`sku_${index}`} value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} /><InputError message={errors[`variants.${index}.sku`]} /></div>
                                    )}
                                    <div><Label htmlFor={`price_${index}`}>Precio de Venta <span className="text-red-500">*</span></Label><Input id={`price_${index}`} type="number" value={variant.selling_price} onChange={e => handleVariantChange(index, 'selling_price', e.target.value)} /><InputError message={errors[`variants.${index}.selling_price`]} /></div>
                                </div>
                                {isStockable && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><Label htmlFor={`cost_${index}`}>Precio de Costo</Label><Input id={`cost_${index}`} type="number" value={variant.cost_price} onChange={e => handleVariantChange(index, 'cost_price', e.target.value)} /><InputError message={errors[`variants.${index}.cost_price`]} /></div>
                                        <div><Label htmlFor={`barcode_${index}`}>Código de Barras</Label><Input id={`barcode_${index}`} value={variant.barcode} onChange={e => handleVariantChange(index, 'barcode', e.target.value)} /><InputError message={errors[`variants.${index}.barcode`]} /></div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isStockable && (
                            <Button type="button" variant="outline" size="sm" onClick={addVariant} className="mt-2">
                                <PlusCircle className="w-4 h-4 mr-2" /> Añadir Variante
                            </Button>
                        )}
                    </Section>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="flex items-center space-x-2">
                            <Switch id="is_active" checked={data.is_active} onCheckedChange={c => setData('is_active', c)} />
                            <Label htmlFor="is_active">Producto Activo en el Catálogo</Label>
                        </div>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando…' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}