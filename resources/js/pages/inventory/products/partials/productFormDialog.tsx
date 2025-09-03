/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Category, Product, Supplier } from '@/types';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import { Trash2 } from 'lucide-react';


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
    attributes: string; // "Talla:M,Color:Rojo"
};

type ProductFormData = {
    name: string;
    slug: string;
    type: 'simple' | 'variable';
    description: string;
    category_id: string | null;
    supplier_id?: string | null;
    barcode: string;
    image: File | null;
    variants: VariantFormData[];
};

const attributesObjectToString = (attributes: Record<string, any> | null | undefined): string =>
    !attributes || Object.keys(attributes).length === 0
        ? ''
        : Object.entries(attributes)
            .map(([k, v]) => `${k}:${v}`)
            .join(',');

// slug helper
const slugify = (text: string) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');

export function ProductFormDialog({
    isOpen,
    setIsOpen,
    categories,
    suppliers,
    productToEdit,
}: ProductFormDialogProps) {
    const isEditing = !!productToEdit;

    const { data, setData, processing, errors, reset, clearErrors } = useForm<ProductFormData>({
        name: '',
        slug: '',
        type: 'simple',
        description: '',
        category_id: null,
        supplier_id: null,
        barcode: '',
        image: null,
        variants: [],
    });

    // preview imagen (nueva o actual)
    const currentImageFromProduct = useMemo(() => {
        const withImage = productToEdit?.variants?.find((v: any) => v?.image_url);
        return withImage?.image_url ?? null;
    }, [productToEdit]);

    const imagePreviewUrl = useMemo(() => {
        if (data.image) return URL.createObjectURL(data.image);
        return currentImageFromProduct;
    }, [data.image, currentImageFromProduct]);

    // variant nueva (para productos "variable")
    const [newVariant, setNewVariant] = useState<VariantFormData>({
        sku: '',
        selling_price: '',
        cost_price: '',
        attributes: '',
    });

    // generar slug automático
    useEffect(() => {
        setData('slug', slugify(data.name));
    }, [data.name]);

    // al abrir el modal: precargar datos si es edición
    useEffect(() => {
        clearErrors();
        if (isOpen && isEditing && productToEdit) {
            setData({
                name: productToEdit.name,
                slug: productToEdit.slug,
                type: productToEdit.type,
                description: productToEdit.description || '',
                category_id: productToEdit.category_id ? String(productToEdit.category_id) : null,
                supplier_id: productToEdit.supplier_id ? String(productToEdit.supplier_id) : null,
                barcode: productToEdit.variants?.[0]?.barcode || '',
                image: null, // por seguridad
                variants: productToEdit.variants.map((variant: any) => ({
                    id: variant.id,
                    sku: variant.sku ?? '',
                    selling_price: String(variant.selling_price ?? ''),
                    cost_price: String(variant.cost_price ?? ''),
                    attributes: attributesObjectToString(variant.attributes),
                })),
            });
        } else if (isOpen && !isEditing) {
            reset();
            // para producto simple, asegúrate de tener una variante vacía
            setData('variants', [{ sku: '', selling_price: '', cost_price: '', attributes: '' }]);
        }
    }, [isOpen, productToEdit]);

    // si cambia el tipo, sincronicemos variantes
    useEffect(() => {
        if (data.type === 'simple') {
            if (data.variants.length === 0) {
                setData('variants', [{ sku: '', selling_price: '', cost_price: '', attributes: '' }]);
            } else if (data.variants.length > 1) {
                setData('variants', [data.variants[0]]);
            }
        }
    }, [data.type]);

    const closeDialog = () => {
        setIsOpen(false);
        reset();
        clearErrors();
        setNewVariant({ sku: '', selling_price: '', cost_price: '', attributes: '' });
    };

    const handleAddVariant = () => {
        if (!newVariant.sku || !newVariant.selling_price) {
            alert('El SKU y el Precio de Venta son obligatorios para cada variante.');
            return;
        }
        setData('variants', [...data.variants, newVariant]);
        setNewVariant({ sku: '', selling_price: '', cost_price: '', attributes: '' });
    };

    const handleRemoveVariant = (index: number) => {
        setData('variants', data.variants.filter((_, i) => i !== index));
    };

    const handleVariantChange = (index: number, key: keyof VariantFormData, value: string) => {
        const next = [...data.variants];
        next[index] = { ...next[index], [key]: value };
        setData('variants', next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: any = { ...data };
        if (!payload.image_path) delete payload.image_path;
        if (!isEditing) delete payload.id;
        if (isEditing) payload._method = "put";

        router.post(
            isEditing ? ProductController.update.url({ product: productToEdit!.id! }) : ProductController.store.url(),
            payload,
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: closeDialog,

            }
        )

    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
                    <DialogDescription>
                        Llena los campos para {isEditing ? 'actualizar' : 'crear'} el producto.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Datos principales */}
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                        <div>
                            <Label>Nombre</Label>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            <InputError message={errors.name} />
                            {data.slug && (
                                <p className="mt-1 text-xs text-muted-foreground">slug: {data.slug}</p>
                            )}
                        </div>

                        <div>
                            <Label>Categoría</Label>
                            <Select
                                onValueChange={(value) => setData('category_id', value)}
                                value={data.category_id ?? ''}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.category_id} />
                        </div>

                        <div>
                            <Label>Proveedor (opcional)</Label>
                            <Select
                                onValueChange={(value) => setData('supplier_id', value)}
                                value={data.supplier_id ?? ''}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>

                                    {suppliers.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Tipo</Label>
                            <Select
                                onValueChange={(value: 'simple' | 'variable') => setData('type', value)}
                                value={data.type}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simple">Simple</SelectItem>
                                    <SelectItem value="variable">Con variantes</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.type} />
                        </div>

                        <div className="md:col-span-2">
                            <Label>Descripción (opcional)</Label>
                            <Textarea
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div>
                            <Label>Código de barras (opcional)</Label>
                            <Input value={data.barcode} onChange={(e) => setData('barcode', e.target.value)} />
                            <InputError message={errors.barcode} />
                        </div>

                        <div>
                            <Label>Imagen</Label>
                            <Input
                                type="file"
                                className="pt-1.5"
                                accept="image/*"
                                onChange={(e) => setData('image', e.target.files ? e.target.files[0] : null)}
                            />
                            <InputError message={errors.image} />
                            {imagePreviewUrl && (
                                <div className="mt-2">
                                    <img
                                        src={imagePreviewUrl}
                                        alt="Vista previa"
                                        className="h-20 w-20 rounded-md object-cover ring-1 ring-border"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <hr />

                    {/* Variantes */}
                    {data.type === 'simple' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <Label>SKU</Label>
                                <Input
                                    value={data.variants[0]?.sku ?? ''}
                                    onChange={(e) =>
                                        setData('variants', [{
                                            ...(data.variants[0] ?? { cost_price: '', selling_price: '', attributes: '' }),
                                            sku: e.target.value,
                                        }])
                                    }
                                />
                                <InputError message={errors['variants.0.sku']} />
                            </div>

                            <div>
                                <Label>Precio costo</Label>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={data.variants[0]?.cost_price ?? ''}
                                    onChange={(e) =>
                                        setData('variants', [{
                                            ...(data.variants[0] ?? { sku: '', selling_price: '', attributes: '' }),
                                            cost_price: e.target.value,
                                        }])
                                    }
                                />
                                <InputError message={errors['variants.0.cost_price']} />
                            </div>

                            <div>
                                <Label>Precio venta</Label>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={data.variants[0]?.selling_price ?? ''}
                                    onChange={(e) =>
                                        setData('variants', [{
                                            ...(data.variants[0] ?? { sku: '', cost_price: '', attributes: '' }),
                                            selling_price: e.target.value,
                                        }])
                                    }
                                />
                                <InputError message={errors['variants.0.selling_price']} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="mb-2 text-lg font-medium">Variantes</h3>

                            {/* Lista editable */}
                            <div className="mb-4 space-y-3 rounded-md border p-4">
                                {data.variants.map((variant, index) => (
                                    <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-5">
                                        <div>
                                            <Label>SKU</Label>
                                            <Input
                                                value={variant.sku}
                                                onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                                            />
                                            <InputError message={errors[`variants.${index}.sku` as any]} />
                                        </div>
                                        <div>
                                            <Label>Precio venta</Label>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                value={variant.selling_price}
                                                onChange={(e) =>
                                                    handleVariantChange(index, 'selling_price', e.target.value)
                                                }
                                            />
                                            <InputError message={errors[`variants.${index}.selling_price` as any]} />
                                        </div>
                                        <div>
                                            <Label>Precio costo</Label>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                value={variant.cost_price}
                                                onChange={(e) =>
                                                    handleVariantChange(index, 'cost_price', e.target.value)
                                                }
                                            />
                                            <InputError message={errors[`variants.${index}.cost_price` as any]} />
                                        </div>
                                        <div>
                                            <Label>Atributos</Label>
                                            <Input
                                                placeholder="Talla:M,Color:Rojo"
                                                value={variant.attributes}
                                                onChange={(e) =>
                                                    handleVariantChange(index, 'attributes', e.target.value)
                                                }
                                            />
                                            <InputError message={errors[`variants.${index}.attributes` as any]} />
                                        </div>
                                        <div className="flex items-end justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveVariant(index)}
                                                aria-label="Eliminar variante"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {data.variants.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        Aún no has añadido ninguna variante.
                                    </p>
                                )}
                            </div>

                            {/* Nueva variante */}
                            <div className="grid grid-cols-1 gap-3 rounded-md border border-dashed p-4 md:grid-cols-5">
                                <div>
                                    <Label>SKU</Label>
                                    <Input
                                        value={newVariant.sku}
                                        onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Precio venta</Label>
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        value={newVariant.selling_price}
                                        onChange={(e) => setNewVariant({ ...newVariant, selling_price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Precio costo</Label>
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        value={newVariant.cost_price}
                                        onChange={(e) => setNewVariant({ ...newVariant, cost_price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Atributos</Label>
                                    <Input
                                        placeholder="Talla:M,Color:Rojo"
                                        value={newVariant.attributes}
                                        onChange={(e) => setNewVariant({ ...newVariant, attributes: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" className="w-full" onClick={handleAddVariant}>
                                        Añadir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando…' : isEditing ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
