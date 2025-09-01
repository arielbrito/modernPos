/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, FormEventHandler, useState } from 'react'; // Importar useEffect
import { useForm, router } from '@inertiajs/react';
import { Category, Product, Supplier } from '@/types';

// Componentes UI
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Importar Textarea
import InputError from '@/components/input-error';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import { Trash2 } from 'lucide-react';

// Props del componente
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
    attributes: string; // Ej: "Talla:M,Color:Rojo"
}

// Datos del formulario (actualizado)
type ProductFormData = {
    name: string;
    slug: string;
    type: 'simple' | 'variable'; // El tipo ahora puede cambiar
    description: string; // Campo añadido
    category_id: string | null;
    sku: string;
    barcode: string; // Campo añadido
    cost_price: string;
    selling_price: string;
    image: File | null;
    variants: VariantFormData[];
};

const attributesObjectToString = (attributes: Record<string, any> | null | undefined): string => {
    if (!attributes || Object.keys(attributes).length === 0) {
        return '';
    }
    return Object.entries(attributes).map(([key, value]) => `${key}:${value}`).join(',');
};


// Función para generar slugs
const slugify = (text: string) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Reemplaza espacios con -
        .replace(/[^\w-]+/g, '') // Remueve caracteres inválidos
        .replace(/--+/g, '-'); // Reemplaza múltiples - con uno solo

export function ProductFormDialog({ isOpen, setIsOpen, categories, productToEdit }: ProductFormDialogProps) {
    const isEditing = !!productToEdit;
    const { data, setData, post, errors, reset, clearErrors, setError } = useForm<ProductFormData>({
        name: '',
        slug: '',
        type: 'simple',
        description: '',
        category_id: null,
        sku: '',
        barcode: '',
        cost_price: '',
        selling_price: '',
        image: null,
        variants: [], // El valor inicial es un array vacío
    });

    const [isProcessing, setIsProcessing] = useState(false);

    const [newVariant, setNewVariant] = useState<VariantFormData>({
        sku: '',
        selling_price: '',
        cost_price: '',
        attributes: '',
    });

    const handleAddVariant = () => {
        // Validación simple antes de añadir
        if (!newVariant.sku || !newVariant.selling_price) {
            alert('El SKU y el Precio de Venta son obligatorios para cada variante.');
            return;
        }
        // Añade la nueva variante a la lista en el estado principal del formulario
        setData('variants', [...data.variants, newVariant]);
        // Limpia el formulario de la nueva variante
        setNewVariant({ sku: '', selling_price: '', cost_price: '', attributes: '' });
    };

    const handleRemoveVariant = (index: number) => {
        setData('variants', data.variants.filter((_, i) => i !== index));
    };

    // useEffect para generar el slug automáticamente
    useEffect(() => {
        setData('slug', slugify(data.name));
    }, [data.name]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        // La creación sigue usando el helper del formulario, es más simple
        if (!isEditing) {
            post((ProductController.store.url()), {
                onSuccess: closeDialog,
            });
            return;
        }

        // Para la EDICIÓN, usamos el router global para tener control total
        setIsProcessing(true);
        router.post(
            (ProductController.update.url({ product: productToEdit.id })), // La URL
            {
                ...data,
                _method: 'put', // Añadimos el método spoofing aquí
            }, // Los datos del formulario
            { // Las opciones
                onSuccess: () => {
                    closeDialog();
                },
                onError: (serverErrors) => {
                    // Si hay errores de validación, los pasamos al estado del formulario
                    setError(serverErrors);
                },
                onFinish: () => {
                    // Se ejecuta siempre al final, haya éxito o error
                    setIsProcessing(false);
                },
            }
        );
    };

    useEffect(() => {
        clearErrors()
        // Si el diálogo está abierto y estamos en modo edición
        if (isOpen && isEditing) {
            setData({
                // Datos del producto principal
                name: productToEdit.name,
                slug: productToEdit.slug,
                type: productToEdit.type,
                description: productToEdit.description || '',
                category_id: productToEdit.category_id ? String(productToEdit.category_id) : null,
                barcode: productToEdit.variants[0]?.barcode || '', // Asumimos un barcode general o el de la primera variante
                image: null, // El campo de imagen se resetea por seguridad

                // Mapeamos las variantes existentes al formato del formulario
                variants: productToEdit.variants.map(variant => ({
                    id: variant.id,
                    sku: variant.sku,
                    selling_price: variant.selling_price,
                    cost_price: variant.cost_price,
                    attributes: attributesObjectToString(variant.attributes), // Convertimos el objeto a string
                })),
            });
        } else {
            // Si es para crear un producto nuevo, resetea el formulario
            reset();
        }
    }, [isOpen, productToEdit]);
    const closeDialog = () => {
        setIsOpen(false);
        reset();
        clearErrors();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                    <DialogDescription>Llena los campos de este formulario para crear o editar un  producto</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* --- DATOS PRINCIPALES DEL PRODUCTO --- */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div><Label>Nombre</Label><Input value={data.name} onChange={e => setData('name', e.target.value)} /><InputError message={errors.name} /></div>
                        <div><Label>Categoría</Label><Select onValueChange={value => setData('category_id', value)} value={data.category_id ?? ''}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}</SelectContent></Select><InputError message={errors.category_id} /></div>
                        <div><Label>Tipo</Label><Select onValueChange={(value: 'simple' | 'variable') => setData('type', value)} value={data.type}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="variable">Con Variantes</SelectItem></SelectContent></Select><InputError message={errors.type} /></div>
                        <div><Label>Código de Barras (Opcional)</Label><Input value={data.barcode} onChange={e => setData('barcode', e.target.value)} /><InputError message={errors.barcode} /></div>
                        <div className="col-span-2"><Label>Descripción (Opcional)</Label><Textarea value={data.description} onChange={e => setData('description', e.target.value)} /><InputError message={errors.description} /></div>
                        <div className="col-span-2"><Label>Imagen</Label><Input type="file" className="pt-1.5" onChange={e => setData('image', e.target.files ? e.target.files[0] : null)} /><InputError message={errors.image} /></div>
                    </div>

                    <hr className="my-4" />

                    {/* --- SECCIÓN DE VARIANTES (LÓGICA CONDICIONAL MEJORADA) --- */}
                    {data.type === 'simple' ? (
                        // FORMULARIO PARA PRODUCTO SIMPLE
                        <div className="grid grid-cols-3 gap-x-6">
                            <div><Label>SKU</Label><Input value={data.variants[0]?.sku || ''} onChange={e => setData('variants', [{ ...data.variants[0], sku: e.target.value, cost_price: data.variants[0]?.cost_price || '', selling_price: data.variants[0]?.selling_price || '', attributes: '' }])} /><InputError message={errors['variants.0.sku']} /></div>
                            <div><Label>Precio Costo</Label><Input type="number" value={data.variants[0]?.cost_price || ''} onChange={e => setData('variants', [{ ...data.variants[0], cost_price: e.target.value, sku: data.variants[0]?.sku || '', selling_price: data.variants[0]?.selling_price || '', attributes: '' }])} /><InputError message={errors['variants.0.cost_price']} /></div>
                            <div><Label>Precio Venta</Label><Input type="number" value={data.variants[0]?.selling_price || ''} onChange={e => setData('variants', [{ ...data.variants[0], selling_price: e.target.value, sku: data.variants[0]?.sku || '', cost_price: data.variants[0]?.cost_price || '', attributes: '' }])} /><InputError message={errors['variants.0.selling_price']} /></div>
                        </div>
                    ) : (
                        // GESTOR DE VARIANTES PARA PRODUCTO VARIABLE
                        <div>
                            <h3 className="text-lg font-medium mb-2">Gestor de Variantes</h3>
                            <div className="space-y-2 rounded-md border p-4 mb-4">
                                {data.variants.map((variant, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <div>
                                            <span className="font-semibold">SKU: {variant.sku}</span>
                                            <div className="text-sm text-muted-foreground"><span>Costo: ${variant.cost_price}</span><span className="mx-2">|</span><span>Venta: ${variant.selling_price}</span>{variant.attributes && <span className="ml-2">({variant.attributes})</span>}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveVariant(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                {data.variants.length === 0 && <p className="text-sm text-center text-muted-foreground">Aún no has añadido ninguna variante.</p>}
                            </div>
                            <div className="grid grid-cols-5 gap-x-4 p-4 border border-dashed">
                                <div><Label>SKU</Label><Input value={newVariant.sku} onChange={e => setNewVariant({ ...newVariant, sku: e.target.value })} /></div>
                                <div><Label>Precio Venta</Label><Input type="number" value={newVariant.selling_price} onChange={e => setNewVariant({ ...newVariant, selling_price: e.target.value })} /></div>
                                <div><Label>Precio Costo</Label><Input type="number" value={newVariant.cost_price} onChange={e => setNewVariant({ ...newVariant, cost_price: e.target.value })} /></div>
                                <div><Label>Atributos</Label><Input placeholder="Talla:M" value={newVariant.attributes} onChange={e => setNewVariant({ ...newVariant, attributes: e.target.value })} /></div>
                                <div className="self-end"><Button type="button" onClick={handleAddVariant} className="w-full">Añadir</Button></div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isProcessing}>{isProcessing ? 'Guardando...' : 'Guardar Producto'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}