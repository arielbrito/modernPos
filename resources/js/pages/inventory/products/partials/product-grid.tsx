import React from 'react';
import { Link } from '@inertiajs/react';
import { Product } from '@/types';
import { useProductSelection } from '../hooks/useProductSelection';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';

// Componentes de UI
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';

// Props que el componente necesita
interface ProductGridProps {
    products: Product[];
    selection: ReturnType<typeof useProductSelection>;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

// Helper para formatear moneda (puedes moverlo a un archivo de helpers)
const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

export function ProductGrid({ products, selection, onEdit, onDelete }: ProductGridProps) {
    // Calcula el stock total sumando el de todas las variantes
    const getStockLevel = (p: Product) => Number(p.total_stock ?? 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
                const primaryVariant = product.variants[0];
                const imageUrl = primaryVariant?.image_url ?? null;
                const price = primaryVariant?.selling_price ?? 0;
                const stock = getStockLevel(product);
                const isSelected = selection.selectedIds.has(product.id);

                return (
                    <Card
                        key={product.id}
                        className="group overflow-hidden hover:shadow-lg transition-all data-[state=selected]:ring-2 data-[state=selected]:ring-primary"
                        data-state={isSelected ? 'selected' : 'unchecked'}
                    >
                        <div className="relative">
                            {/* Imagen del Producto */}
                            <div className="h-48 w-full flex items-center justify-center bg-muted dark:bg-slate-800">
                                {imageUrl ? (
                                    <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-muted-foreground">{product.name[0]?.toUpperCase()}</span>
                                )}
                            </div>

                            {/* Badge de Stock Bajo */}
                            {stock < 10 && stock > 0 && (
                                <Badge variant="destructive" className="absolute top-2 left-2">
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Stock Bajo
                                </Badge>
                            )}
                            {stock <= 0 && (
                                <Badge variant="destructive" className="absolute top-2 left-2">Agotado</Badge>
                            )}

                            {/* Checkbox de Selección (aparece al pasar el mouse) */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 data-[state=selected]:opacity-100 transition-opacity">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => selection.toggle(product.id)}
                                    className="bg-background h-5 w-5"
                                    aria-label={`Seleccionar ${product.name}`}
                                />
                            </div>
                        </div>

                        <div className="p-4 flex flex-col justify-between flex-1">
                            <div>
                                {/* Nombre y Menú de Acciones */}
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold line-clamp-2 flex-1 pr-2">{product.name}</h3>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild><Link href={ProductController.show.url({ product: product.id })}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link></DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(product)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(product)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Categoría y Estado */}
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{product.category?.name ?? 'Sin categoría'}</span>
                                    <Badge variant={product.is_active ? 'default' : 'outline'} className="text-xs">{product.is_active ? 'Activo' : 'Inactivo'}</Badge>
                                </div>
                            </div>

                            {/* Precio y Stock */}
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(price)}</span>
                                <span className={`text-sm font-medium ${stock < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    Stock: {stock}
                                </span>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}