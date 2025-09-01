/* eslint-disable react-hooks/exhaustive-deps */
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { Category } from '@/types';

// Componentes UI de shadcn/ui
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';

// Props del componente
interface CategoryFormDialogProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    allCategories: Pick<Category, 'id' | 'name'>[]; // Solo necesitamos id y name
    categoryToEdit?: Category | null;
}

// Datos del formulario
type CategoryFormData = {
    name: string;
    description: string;
    parent_id: string | null; // El valor del select es un string
};

export function CategoryFormDialog({ isOpen, setIsOpen, allCategories, categoryToEdit }: CategoryFormDialogProps) {
    const isEditing = !!categoryToEdit;
    const { data, setData, post, put, processing, errors, reset } = useForm<CategoryFormData>({
        name: '',
        description: '',
        parent_id: '' as string | null,
    });

    useEffect(() => {
        if (isEditing) {
            setData({
                name: categoryToEdit.name,
                description: categoryToEdit.description || '',
                parent_id: categoryToEdit.parent_id ? String(categoryToEdit.parent_id) : null,
            });
        }
    }, [isEditing, categoryToEdit]);

    const closeDialog = () => {
        setIsOpen(false);
        reset();
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEditing) {
            put((CategoryController.update.url({ category: categoryToEdit.id })), {
                onSuccess: closeDialog,
            })

        } else {
            post((CategoryController.store.url()), {
                onSuccess: closeDialog,
            });

        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                    <DialogDescription> {isEditing ? 'Editar una  Categoría' : 'Crea una nueva Categoría'} </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor="description">Descripción (Opcional)</Label>
                        <Input id="description" value={data.description} onChange={e => setData('description', e.target.value)} />
                        <InputError message={errors.description} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor="parent_id">Categoría Padre (Opcional)</Label>
                        <Select onValueChange={value => setData('parent_id', value)} value={data.parent_id ?? ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar categoría padre..." />
                            </SelectTrigger>
                            <SelectContent>

                                {allCategories.map(cat => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.parent_id} className="mt-2" />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}