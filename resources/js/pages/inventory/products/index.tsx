/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';

// Layouts y Tipos
import AppLayout from '@/layouts/app-layout';
import { Product, PaginatedResponse, Supplier, Category, BreadcrumbItem, PaginationLink } from '@/types';

// Componentes de UI Partials
import { ProductFormDialog } from './partials/productFormDialog';
import { ProductsToolbar } from './partials/product-toolbar';
import { ProductTable } from './partials/product-table';
import { ProductGrid } from './partials/product-grid';
import { DeleteProductDialog } from './partials/delete-productDialog';

// Asumiendo un componente de paginación
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableSkeleton } from './partials/table-skeleton';
import { GridSkeleton } from './partials/grid-skeleton';
import { EmptyState } from './partials/empty-state';

// Hooks de Lógica
import { useProductFilters } from './hooks/useProductFilters';
import { useProductSelection } from './hooks/useProductSelection';
import { useProductActions } from './hooks/useProductActions';
import { Pagination } from '@/components/pagination';

import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import { StatsCards } from './partials/stockHistoryCard';
import { Paginator } from './partials/paginator';



// Props
interface IndexProps {
    products: PaginatedResponse<Product>;
    suppliers: Supplier[];
    categories: Category[];
    storeStats: any; // Se recomienda crear un tipo específico para esto
    filters: Record<string, any>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Inventario',
        href: ''
    },
    { title: 'Productos', href: ProductController.index.url() },
];

export default function ProductIndexPage({ products, categories, suppliers, storeStats, filters: initialFilters }: IndexProps) {
    // --- 1. HOOKS DE LÓGICA ---
    const filters = useProductFilters(initialFilters);
    const actions = useProductActions();
    const productIds = useMemo(() => products.data.map(p => p.id), [products.data]);
    const selection = useProductSelection(productIds);


    // --- 2. ESTADO LOCAL DE LA UI ---
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');




    // --- 3. RENDERIZADO DECLARATIVO ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />

            <div className="max-w-7xl mx-auto space-y-6 py-10 px-4 sm:px-6 lg:px-8">
                <StatsCards stats={storeStats} categoriesCount={categories.length} lowStockCount={storeStats.current.low_stock_count} />

                <Card>
                    <CardHeader>
                        <ProductsToolbar
                            filters={filters}
                            selection={selection}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            onAddNew={actions.handleCreate}
                            categories={categories}
                            suppliers={suppliers}
                        />
                    </CardHeader>
                    <CardContent>
                        {filters.isProcessing ? (
                            viewMode === 'table' ? <TableSkeleton /> : <GridSkeleton />
                        ) : products.data.length === 0 ? (
                            <EmptyState
                                onActionClick={actions.handleCreate}
                                hasFilters={filters.activeFilterCount > 0}
                                onClearFilters={filters.clearFilters}
                            />
                        ) : (
                            viewMode === 'table' ? (
                                <ProductTable
                                    products={products.data}
                                    selection={selection}
                                    onEdit={actions.handleEdit}
                                    onDelete={actions.handleDelete}
                                    onSort={filters.handleSort}
                                    sortField={filters.data.sort_field}
                                    sortDirection={filters.data.sort_direction}
                                />
                            ) : (
                                <ProductGrid
                                    products={products.data}
                                    selection={selection}
                                    onEdit={actions.handleEdit}
                                    onDelete={actions.handleDelete}
                                />
                            )
                        )}
                    </CardContent>


                    {products.links.length > 3 && (
                        <div className="border-t p-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Mostrando {products.from} a {products.to} de {products.total} resultados
                            </span>
                            {/* Aquí pasamos `products.links` que ya viene del backend con todos los filtros */}
                            <Paginator links={products.links} />
                        </div>
                    )}
                </Card>
            </div>

            {/* --- DIÁLOGOS Y MODALES --- */}
            <ProductFormDialog
                isOpen={actions.isFormOpen}
                setIsOpen={actions.setIsFormOpen}
                productToEdit={actions.productToEdit}
                categories={categories}
                suppliers={suppliers}
            />
            <DeleteProductDialog
                isOpen={actions.isDeleteModalOpen}
                setIsOpen={actions.setDeleteModalOpen}
                productToDelete={actions.productToDelete}
                onSuccess={() => selection.reset()}
            />


        </AppLayout>
    );
}