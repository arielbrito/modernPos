
import { useState, FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';

// Tipos que definimos
import { User, Product, PaginatedResponse, Supplier, Category, BreadcrumbItem } from '@/types';

// Layout y Componentes UI (usando el alias '@' que seguro tienes configurado)
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductFormDialog } from './partials/productFormDialog';
import products from '@/routes/inventory/products';
import { Pencil, Trash2 } from 'lucide-react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';


// 1. Definimos la interfaz para las props que recibe la página
interface IndexProps {
    auth: {
        user: User;
    };
    products: PaginatedResponse<Product>;
    suppliers: Supplier[];
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categorias',
        href: products.index.url(),
    },
];

export default function Index({ products, categories, suppliers }: IndexProps) {
    // 2. Tipamos el estado
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)


    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setDeleteModalOpen(true)
    }


    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const { delete: deleteDestroy, processing: deleteProcessing } = useForm();

    const handleDeleteClick: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        deleteDestroy(ProductController.destroy.url({ product: selectedProduct.id }), {
            onSuccess: () => setDeleteModalOpen(false)
        })
    }

    const handleAddNewClick = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };



    return (
        <AppLayout
            breadcrumbs={breadcrumbs}

        >
            <Head title="Productos" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Catálogo de Productos</CardTitle>
                            <Button onClick={handleAddNewClick}>Añadir Producto</Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Imagen</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Precio Venta</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.data.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <img
                                                    src={product.variants[0]?.image_url || product.variants[1]?.image_url}
                                                    alt={product.name}
                                                    className="h-10 w-10 object-cover rounded"
                                                />
                                            </TableCell>
                                            <TableCell>{product.variants[0]?.sku || 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>${parseFloat(product.variants[0]?.selling_price || '0').toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => handleEditClick(product)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="icon" onClick={() => openDeleteModal(product)}>
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

            <ProductFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                categories={categories}
                productToEdit={editingProduct} // Pasar el producto a editar
                suppliers={suppliers}
            />

            {/* --- Delete Dialog --- */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>¿Está seguro?</DialogTitle><DialogDescription>Esto eliminará permanentemente este producto: <strong>{selectedProduct?.name}</strong>.</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteClick} disabled={deleteProcessing}>Eliminar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}