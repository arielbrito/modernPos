import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@inertiajs/react";
import { Eye, AlertTriangle, Package } from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { money, toNum } from "@/utils/inventory";
import ProductController from "@/actions/App/Http/Controllers/Inventory/ProductController";

interface Props {
    product: Product | null;
    onOpenChange: (isOpen: boolean) => void;
}

// --- Helper Functions ---

const getStockLevel = (product: Product): number => {
    if (!product.variants) return 0;
    // Sum the stock of all variants
    return toNum(product.total_stock);
};

const getPriceSummary = (product: Product): string => {
    if (!product.variants || product.variants.length === 0) return money(0);
    if (product.variants.length === 1) {
        return money(toNum(product.variants[0].selling_price));
    }
    // For variable products, find the min and max prices
    const prices = product.variants.map(v => toNum(v.selling_price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return `${money(minPrice)} - ${money(maxPrice)}`;
};

const getImageFromProduct = (product: Product): string | null => {
    return product.variants?.[0]?.image_url ?? null;
};

// --- Main Component ---

export function ProductPreviewModal({ product, onOpenChange }: Props) {
    if (!product) {
        return null;
    }

    const totalStock = getStockLevel(product);
    const hasLowStock = totalStock < 10 && product.product_nature === 'stockable';

    return (
        <Dialog open={!!product} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        {product.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Section */}
                        <div>
                            {getImageFromProduct(product) ? (
                                <img
                                    src={getImageFromProduct(product)!}
                                    alt={product.name}
                                    className="w-full h-64 object-cover rounded-lg border"
                                />
                            ) : (
                                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                                    <Package className="h-16 w-16 text-muted-foreground/50" />
                                </div>
                            )}
                        </div>

                        {/* Information Section */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{product.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Categoría</span>
                                    <div className="font-medium">{product.category?.name ?? 'Sin categoría'}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Precio de Venta</span>
                                    <div className="font-medium">{getPriceSummary(product)}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Stock Total</span>
                                    <div className={`font-bold flex items-center gap-1 ${hasLowStock ? 'text-destructive' : ''}`}>
                                        {totalStock}
                                        {hasLowStock && <AlertTriangle className="h-4 w-4" />}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tipo</span>
                                    <div className="font-medium capitalize">{product.type}</div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Badge variant={product.is_active ? 'default' : 'outline'}>
                                    {product.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                                {product.variants && product.variants.length > 1 && (
                                    <Badge variant="secondary">{product.variants.length} variantes</Badge>
                                )}
                                {hasLowStock && <Badge variant="destructive">Stock bajo</Badge>}
                            </div>
                        </div>
                    </div>

                    {/* Variants Table */}
                    {product.variants && product.variants.length > 1 && (
                        <div>
                            <h4 className="font-semibold mb-3">Variantes</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md">
                                {product.variants.map((variant) => (
                                    <div key={variant.id} className="flex items-center justify-between p-3 even:bg-muted/50 text-sm">
                                        <div>
                                            <span className="font-mono text-xs">{variant.sku}</span>
                                            {variant.attributes && (
                                                <span className="ml-2 text-muted-foreground">
                                                    {Object.values(variant.attributes).join(' / ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">{money(toNum(variant.selling_price))}</span>
                                            <span className="text-muted-foreground text-xs">Stock: {toNum(variant.stock_quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    <Button asChild>
                        <Link href={ProductController.edit.url({ product: product.id })}>Editar Producto</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}