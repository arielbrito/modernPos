/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Link } from '@inertiajs/react';
import { Product } from '@/types';
import { useProductSelection } from '../hooks/useProductSelection';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';

// Componentes de UI
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductPreviewModal } from "./PreviewProduct"; // <-- 1. Importar el modal

// Props que el componente necesita
interface ProductTableProps {
    products: Product[];
    selection: ReturnType<typeof useProductSelection>;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    onSort: (field: 'name' | 'price' | 'created_at') => void;
    sortField: string;
    sortDirection: 'asc' | 'desc';
}

// Sub-componente para cabeceras de tabla ordenables
const SortableHeader = ({ children, field, onSort, sortField, sortDirection }: any) => (
    <Button variant="ghost" className="h-auto p-0 font-semibold hover:bg-transparent" onClick={() => onSort(field)}>
        {children}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", sortField !== field && "text-muted-foreground/50")} />
    </Button>
);

export function ProductTable({ products, selection, onEdit, onDelete, onSort, sortField, sortDirection }: ProductTableProps) {
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    const getStockLevel = (p: Product) => Number(p.total_stock ?? 0);
    const [previewProduct, setPreviewProduct] = React.useState<Product | null>(null);

    return (
        <div className="w-full overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"><Checkbox checked={selection.areAllSelected} onCheckedChange={selection.toggleAll} /></TableHead>
                        <TableHead className="w-[72px]">Imagen</TableHead>
                        <TableHead><SortableHeader field="name" {...{ onSort, sortField, sortDirection }}>Producto</SortableHeader></TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right"><SortableHeader field="price" {...{ onSort, sortField, sortDirection }}>Precio</SortableHeader></TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[80px] text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => {
                        const primaryVariant = product.variants[0];
                        const imageUrl = primaryVariant?.image_url ?? null;
                        const isSelected = selection.selectedIds.has(product.id);
                        const stock = getStockLevel(product);

                        return (
                            <TableRow key={product.id} data-state={isSelected && 'selected'}>
                                <TableCell><Checkbox checked={isSelected} onCheckedChange={() => selection.toggle(product.id)} /></TableCell>
                                <TableCell>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-muted text-xs font-medium ring-1 ring-border">
                                        {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover rounded-md" /> : <span>{product.name[0]}</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium max-w-xs truncate">{product.name}</TableCell>
                                <TableCell className="font-mono text-sm">{primaryVariant?.sku}</TableCell>
                                <TableCell>{product.category?.name || 'N/A'}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(primaryVariant?.selling_price)}</TableCell>
                                <TableCell className={`text-right font-medium ${stock < 10 ? 'text-destructive' : ''}`}>{stock}</TableCell>
                                <TableCell><Badge variant={product.is_active ? 'default' : 'outline'}>{product.is_active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setPreviewProduct(product)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Vista previa
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild><Link href={ProductController.show.url({ product: product.id })}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link></DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(product)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(product)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <ProductPreviewModal
                product={previewProduct}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setPreviewProduct(null);
                    }
                }}
            />
        </div>
    );
}