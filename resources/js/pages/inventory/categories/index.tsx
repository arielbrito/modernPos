import { FormEventHandler, useState, useCallback, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Blend, Pencil, Trash2, Plus } from 'lucide-react';

// Tipos
import { User, Category, BreadcrumbItem } from '@/types';

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
import { Pagination } from '@/components/pagination';

// Props de la página
type PageLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedResponse<T> = {
    data: T[];
    links: PageLink[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
    };
};

interface IndexProps {
    auth: { user: User };
    categories: PaginatedResponse<Category>;
    allCategories: Category[];
}

// Constantes
const BREADCRUMBS: BreadcrumbItem[] = [
    {
        title: 'Categorías',
        href: categories.index.url(),
    },
];

const PAGE_TITLE = 'Categorías de Productos';
const SECTION_TITLE = 'Gestión de Categorías';
const TABLE_TITLE = 'Listado de Categorías';

export default function Index({ categories, allCategories }: IndexProps) {
    // Estados relacionados con el formulario
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Estados relacionados con la eliminación
    const [isDeleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Hook de formulario para eliminación
    const { delete: deleteDestroy, processing: deleteProcessing } = useForm();

    // Handlers optimizados con useCallback
    const handleEditClick = useCallback((category: Category) => {
        setEditingCategory(category);
        setIsFormOpen(true);
    }, []);

    const handleAddNewClick = useCallback(() => {
        setEditingCategory(null);
        setIsFormOpen(true);
    }, []);

    const openDeleteModal = useCallback((category: Category) => {
        setSelectedCategory(category);
        setDeleteModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        setDeleteModalOpen(false);
        setSelectedCategory(null);
    }, []);

    const handleDeleteConfirm: FormEventHandler = useCallback((e) => {
        e.preventDefault();
        if (!selectedCategory) return;

        deleteDestroy(CategoryController.destroy.url({ category: selectedCategory.id }), {
            onSuccess: () => {
                setDeleteModalOpen(false);
                setSelectedCategory(null);
            },
            onError: (errors) => {
                console.error('Error al eliminar categoría:', errors);
                // Aquí podrías mostrar un toast o mensaje de error
            }
        });
    }, [selectedCategory, deleteDestroy]);

    // Memo para optimizar el renderizado de las filas de la tabla
    const tableRows = useMemo(() => {
        return categories.data.map((category) => (
            <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                    {category.parent ? (
                        <Badge variant="secondary">{category.parent.name}</Badge>
                    ) : (
                        <span className="text-muted-foreground">Sin categoría padre</span>
                    )}
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditClick(category)}
                            aria-label={`Editar categoría ${category.name}`}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => openDeleteModal(category)}
                            aria-label={`Eliminar categoría ${category.name}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        ));
    }, [categories.data, handleEditClick, openDeleteModal]);

    return (
        <AppLayout breadcrumbs={BREADCRUMBS}>
            <Head title={PAGE_TITLE} />

            <div className="container mx-auto px-4 py-6">
                {/* Header Section */}
                <header className="mb-6 flex items-center gap-3">
                    <Blend
                        size={32}
                        className="text-blue-600"
                        aria-hidden="true"
                    />
                    <h1 className="text-2xl font-semibold text-foreground">
                        {SECTION_TITLE}
                    </h1>
                </header>

                {/* Main Content Card */}
                <Card className="shadow-sm border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-xl">{TABLE_TITLE}</CardTitle>
                        <Button
                            onClick={handleAddNewClick}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {/* Verificar si hay datos */}
                        {categories.data.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Blend className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">No hay categorías disponibles</p>
                                <p className="text-sm mt-1">Comienza creando tu primera categoría</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-semibold">Nombre</TableHead>
                                                <TableHead className="font-semibold">Categoría Padre</TableHead>
                                                <TableHead className="font-semibold w-32">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tableRows}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Paginación */}
                                <div className="mt-4">
                                    <Pagination links={categories.links} />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Category Form Dialog */}
            <CategoryFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                allCategories={allCategories}
                categoryToEdit={editingCategory}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Confirmar eliminación?</DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                Esta acción eliminará permanentemente la categoría{' '}
                                <strong className="text-foreground">"{selectedCategory?.name}"</strong>.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Esta acción no se puede deshacer.
                            </p>
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={closeDeleteModal}
                            disabled={deleteProcessing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteProcessing}
                        >
                            {deleteProcessing ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}