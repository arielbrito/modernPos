/* eslint-disable @typescript-eslint/no-explicit-any */
import { Head, Link, router } from '@inertiajs/react';
import { useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BreadcrumbItem, Product } from '@/types';
import products from '@/routes/inventory/products';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

type StoreOption = { id: number; name: string };

type StockByStore = {
    store: { id: number; name: string };
    qty: number;
};

type Movement = {
    id: number;
    date: string;
    type: 'purchase_entry' | 'sale_exit' | 'adjustment_in' | 'adjustment_out';
    type_label: string;
    quantity: number;   // ya con signo
    unit_price: string; // string desde backend (decimal)
    subtotal: string;   // string desde backend (decimal)
    notes?: string | null;
    store?: { id: number; name: string } | null;
    variant?: { id: number; sku: string } | null;
    user?: { id: number; name: string } | null;
};

interface ShowProps {
    product: Product;
    stock: { total: number; per_store: StockByStore[] };
    movements: Movement[];
    stores: StoreOption[];
    selected_store_id: number | null;
    variant_stock: Record<number, number>; // { [variantId]: qty } solo si hay tienda
}

const formatCurrency = (n: number | string, currency = 'DOP', locale = 'es-DO') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(n ?? 0));

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const priceSummary = (p: Product) => {
    if (!p.variants?.length) return formatCurrency(0);
    const prices = p.variants.map((v: any) => Number(v?.selling_price ?? 0));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const firstImage = (p: Product) => {
    const withImage = p.variants?.find((v: any) => v?.image_url);
    return withImage?.image_url ?? null;
};

export default function Show({
    product, stock, movements, stores, selected_store_id, variant_stock,
}: ShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Productos', href: products.index.url() },
        { title: product.name, href: products.show.url({ product: product.id }) },
    ];

    const selectedLabel = useMemo(() => {
        if (!selected_store_id) return 'Todas las tiendas';
        const s = stores.find(s => s.id === selected_store_id);
        return s ? s.name : `Tienda #${selected_store_id}`;
    }, [selected_store_id, stores]);

    const handleStoreChange = (value: string) => {
        const id = value ? Number(value) : null;
        router.get(
            ProductController.show.url({ product: product.id }),
            id ? { store_id: id } : {},
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Producto · ${product.name}`} />

            <div className="py-8">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                {firstImage(product) ? (
                                    <img
                                        src={firstImage(product)!}
                                        alt={product.name}
                                        className="h-16 w-16 rounded-md object-cover ring-1 ring-border"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-lg font-semibold ring-1 ring-border">
                                        {product.name?.[0]?.toUpperCase() ?? 'P'}
                                    </div>
                                )}
                                <div>
                                    <CardTitle className="text-xl">{product.name}</CardTitle>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="secondary">{product.category?.name ?? 'Sin categoría'}</Badge>
                                        <Badge variant={product.is_active ? 'default' : 'outline'}>
                                            {product.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                        <span>•</span>
                                        <span>{product.type === 'variable' ? 'Variable' : 'Simple'}</span>
                                        <span>•</span>
                                        <span>{priceSummary(product)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Link href={products.index.url()}>
                                    <Button variant="outline">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Volver
                                    </Button>
                                </Link>
                                <Link href={ProductController.edit.url({ product: product.id })}>
                                    <Button variant="secondary">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                </Link>
                                <Link
                                    as="button"
                                    method="delete"
                                    href={ProductController.destroy.url({ product: product.id })}
                                    onClick={(e) => {
                                        if (!confirm('¿Seguro que deseas eliminar este producto?')) e.preventDefault();
                                    }}
                                >
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Filtro por tienda</CardTitle>
                            <div className="w-64">
                                <Select
                                    value={selected_store_id ? String(selected_store_id) : ''}
                                    onValueChange={handleStoreChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las tiendas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map(s => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Mostrando datos para: <span className="font-medium text-foreground">{selectedLabel}</span>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Col izquierda: descripción + variantes + movimientos */}
                        <div className="md:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
                                <CardContent>
                                    {product.description ? (
                                        <p className="leading-relaxed">{product.description}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Sin descripción.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Variantes</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    {product.variants?.length ? (
                                        <div className="w-full overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Imagen</TableHead>
                                                        <TableHead>SKU</TableHead>
                                                        <TableHead>Precio venta</TableHead>
                                                        <TableHead>Precio costo</TableHead>
                                                        <TableHead>Atributos</TableHead>
                                                        {selected_store_id && <TableHead className="text-right">Stock (tienda)</TableHead>}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {product.variants.map((v: any) => (
                                                        <TableRow key={v.id}>
                                                            <TableCell>
                                                                {v.image_url ? (
                                                                    <img src={v.image_url} className="h-10 w-10 rounded-md object-cover ring-1 ring-border" />
                                                                ) : (
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-medium ring-1 ring-border">
                                                                        {product.name?.[0]?.toUpperCase() ?? 'P'}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-sm">{v.sku ?? '—'}</TableCell>
                                                            <TableCell>{formatCurrency(v.selling_price ?? 0)}</TableCell>
                                                            <TableCell>{formatCurrency(v.cost_price ?? 0)}</TableCell>
                                                            <TableCell className="text-sm">
                                                                {v.attributes && Object.keys(v.attributes).length > 0
                                                                    ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')
                                                                    : '—'}
                                                            </TableCell>
                                                            {selected_store_id && (
                                                                <TableCell className="text-right">
                                                                    {variant_stock?.[v.id] ?? 0}
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-sm text-muted-foreground">Sin variantes.</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Movimientos recientes</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    {movements?.length ? (
                                        <div className="w-full overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Fecha</TableHead>
                                                        {!selected_store_id && <TableHead>Tienda</TableHead>}
                                                        <TableHead>Variante</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead className="text-right">Cantidad</TableHead>
                                                        <TableHead className="text-right">Precio</TableHead>
                                                        <TableHead className="text-right">Subtotal</TableHead>
                                                        <TableHead>Nota</TableHead>
                                                        <TableHead>Usuario</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {movements.map((m) => (
                                                        <TableRow key={m.id}>
                                                            <TableCell className="whitespace-nowrap">{formatDateTime(m.date)}</TableCell>
                                                            {!selected_store_id && <TableCell>{m.store?.name ?? '—'}</TableCell>}
                                                            <TableCell className="font-mono text-sm">{m.variant?.sku ?? '—'}</TableCell>
                                                            <TableCell>{m.type_label}</TableCell>
                                                            <TableCell className="text-right">
                                                                {m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`}
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(m.unit_price)}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(m.subtotal)}</TableCell>
                                                            <TableCell className="max-w-[320px] truncate" title={m.notes ?? ''}>
                                                                {m.notes ?? '—'}
                                                            </TableCell>
                                                            <TableCell>{m.user?.name ?? '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-sm text-muted-foreground">Sin movimientos.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Col derecha: info + existencias */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Información</CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Categoría</span><span>{product.category?.name ?? '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Proveedor</span><span>{(product as any).supplier?.name ?? '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{product.type === 'variable' ? 'Variable' : 'Simple'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span className="font-mono">{product.slug}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span>{product.is_active ? 'Activo' : 'Inactivo'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Creación</span><span>{new Date(product.created_at as any).toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Actualización</span><span>{new Date(product.updated_at as any).toLocaleString()}</span></div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Existencias</CardTitle>
                                    <Badge>{stock.total} en total</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {stock.per_store?.length ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tienda</TableHead>
                                                    <TableHead className="text-right">Stock</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {stock.per_store.map(({ store, qty }) => (
                                                    <TableRow key={store.id}>
                                                        <TableCell>{store.name}</TableCell>
                                                        <TableCell className="text-right">{qty}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="p-6 text-sm text-muted-foreground">Sin existencias registradas.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
