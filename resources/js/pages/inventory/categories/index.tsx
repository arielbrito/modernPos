import { FormEventHandler, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react'; // Iconos

// Tipos
import { User, Category, PaginatedResponse, BreadcrumbItem } from '@/types';

// Layout y Componentes UI
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CategoryFormDialog } from './partials/categoryFormDialog';
import categories from '@/routes/inventory/categories';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Props de la página
interface IndexProps {
    auth: { user: User };
    categories: PaginatedResponse<Category>;
    allCategories: Category[]; // La lista completa para el formulario
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categorias',
        href: categories.index.url(),
    },
];

export default function Index({ categories, allCategories }: IndexProps) {
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    const { delete: deleteDestroy, processing: deleteProcessing } = useForm();

    const handleEditClick = (category: Category) => {
        setEditingCategory(category);
        setIsFormOpen(true);
    };

    const openDeleteModal = (category: Category) => {
        setSelectedCategory(category);
        setDeleteModalOpen(true)
    }

    const handleAddNewClick = () => {
        setEditingCategory(null); // Asegurarse de que no estamos en modo edición
        setIsFormOpen(true);
    };

    const handleDeleteClick: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedCategory) return;
        deleteDestroy(CategoryController.destroy.url({ category: selectedCategory.id }), {
            onSuccess: () => setDeleteModalOpen(false)
        })
    }

    return (
        <AppLayout

            breadcrumbs={breadcrumbs}
        >
            <Head title="Categorías de Productos" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Listado de Categorías</CardTitle>
                            <Button onClick={handleAddNewClick}>Nueva Categoría</Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Categoría Padre</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.data.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>
                                                {category.parent
                                                    ? <Badge variant="secondary">{category.parent.name}</Badge>
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => handleEditClick(category)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="icon" onClick={() => openDeleteModal(category)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CategoryFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                allCategories={allCategories} // Pasamos las categorías al formulario
                categoryToEdit={editingCategory} // Pasar la categoría a editar
            />

            {/* --- Delete Dialog --- */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>¿Está seguro?</DialogTitle><DialogDescription>Esto eliminará permanentemente esta categoria: <strong>{selectedCategory?.name}</strong>.</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteClick} disabled={deleteProcessing}>Eliminar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}