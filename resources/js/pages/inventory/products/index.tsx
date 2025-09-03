/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

import { User, Product, PaginatedResponse, Supplier, Category, BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import products from '@/routes/inventory/products';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

import { Pencil, Trash2, MoreVertical, Plus, Eye } from 'lucide-react';
import { ProductFormDialog } from './partials/productFormDialog';

// Props
interface IndexProps {
    auth: { user: User };
    products: PaginatedResponse<Product>;
    suppliers: Supplier[];
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Productos', href: products.index.url() },
];

// Helpers
const formatCurrency = (value: number | string, currency = 'DOP', locale = 'es-DO') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value ?? 0));

const getPrimaryVariant = (p: Product) => p.variants?.[0] ?? null;

const getImageFromProduct = (p: Product) => {
    const withImage = p.variants?.find(v => !!(v as any).image_url);
    return withImage ? (withImage as any).image_url : null;
};

const getPriceSummary = (p: Product) => {
    if (!p.variants?.length) return formatCurrency(0);
    const prices = p.variants.map(v => Number((v as any).selling_price ?? 0));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

export default function Index({ products, categories, suppliers }: IndexProps) {
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Filtros/búsqueda (GET a la misma ruta)
    const { data, setData, get, processing } = useForm({
        search: '',
        category_id: '',
        supplier_id: '',
    });

    const submitFilters = (e?: React.FormEvent) => {
        e?.preventDefault();
        get(products.index.url(), { preserveScroll: true, preserveState: true, replace: true });
    };

    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setDeleteModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const { delete: deleteDestroy, processing: deleteProcessing } = useForm();

    const handleDeleteClick: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        deleteDestroy(ProductController.destroy.url({ product: selectedProduct.id }), {
            onSuccess: () => setDeleteModalOpen(false),
        });
    };

    const handleAddNewClick = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">No hay productos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Crea tu primer producto para empezar a vender.
            </p>
            <Button className="mt-6" onClick={handleAddNewClick}>
                Añadir producto
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Toolbar */}
                    <Card>
                        <CardContent className="pt-6">
                            <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Input
                                        placeholder="Buscar por nombre o SKU…"
                                        value={data.search}
                                        onChange={(e) => setData('search', e.target.value)}
                                    />
                                </div>
                                <Select
                                    value={data.category_id}
                                    onValueChange={(v) => setData('category_id', v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Filtrar por categoría" />
                                    </SelectTrigger>
                                    <SelectContent>

                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={data.supplier_id}
                                    onValueChange={(v) => setData('supplier_id', v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Filtrar por proveedor" />
                                    </SelectTrigger>
                                    <SelectContent>

                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center justify-end gap-2 md:col-span-4">
                                    <Button type="button" variant="outline" onClick={() => {
                                        setData({ search: '', category_id: '', supplier_id: '' });
                                        get(products.index.url(), { preserveScroll: true, replace: true });
                                    }}>
                                        Limpiar
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Aplicar
                                    </Button>
                                    <Button onClick={handleAddNewClick}>
                                        Añadir producto
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabla */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Catálogo de productos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {products.data.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[72px]">Imagen</TableHead>
                                                <TableHead>SKU / Variantes</TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                                                <TableHead className="hidden md:table-cell">Estado</TableHead>
                                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.data.map((product) => {
                                                const primary = getPrimaryVariant(product);
                                                const img = getImageFromProduct(product);
                                                const price = getPriceSummary(product);
                                                const variantsCount = product.variants?.length ?? 0;

                                                return (
                                                    <TableRow key={product.id} className="hover:bg-muted/40">
                                                        <TableCell>
                                                            {img ? (
                                                                <img
                                                                    src={img}
                                                                    alt={product.name}
                                                                    className="h-10 w-10 rounded-md object-cover ring-1 ring-border"
                                                                />
                                                            ) : (
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-medium ring-1 ring-border">
                                                                    {product.name?.[0]?.toUpperCase() ?? 'P'}
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="font-mono text-sm">
                                                            {primary?.sku ?? '—'}
                                                            {variantsCount > 1 && (
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    (+{variantsCount - 1})
                                                                </span>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="font-medium">
                                                            {product.name}
                                                        </TableCell>

                                                        <TableCell className="hidden md:table-cell">
                                                            {product.category?.name ?? '—'}
                                                        </TableCell>

                                                        <TableCell className="whitespace-nowrap">
                                                            {price}
                                                        </TableCell>

                                                        <TableCell className="hidden md:table-cell">
                                                            <Badge variant="secondary">
                                                                {product.type === 'variable' ? 'Variable' : 'Simple'}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="hidden md:table-cell">
                                                            <Badge variant={product.is_active ? 'default' : 'outline'}>
                                                                {product.is_active ? 'Activo' : 'Inactivo'}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={ProductController.show.url({ product: product.id })}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Editar
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => openDeleteModal(product)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Eliminar
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>

                        {/* Paginación */}
                        {products.links && products.links.length > 0 && (
                            <div className="flex items-center justify-between border-t px-6 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {products.meta?.from ?? 1}–{products.meta?.to ?? products.data.length} de {products.meta?.total ?? products.data.length}
                                </div>
                                <div className="flex items-center gap-2">
                                    {products.links.map((link, idx) => (
                                        <Button
                                            key={idx}
                                            size="sm"
                                            variant={link.active ? 'default' : 'outline'}
                                            className="min-w-9"
                                            disabled={!link.url}
                                            onClick={() => {
                                                if (link.url) {
                                                    // Mantener filtros actuales
                                                    get(link.url, { preserveState: true, preserveScroll: true, replace: true });
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Dialogo de crear/editar */}
            <ProductFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                categories={categories}
                suppliers={suppliers}
                productToEdit={editingProduct}
            />

            {/* Delete Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Está seguro?</DialogTitle>
                        <DialogDescription>
                            Esto eliminará permanentemente el producto{' '}
                            <strong>{selectedProduct?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteClick} disabled={deleteProcessing}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
