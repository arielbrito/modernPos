import React from 'react';
import { useForm } from '@inertiajs/react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';

interface DeleteDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    productToDelete: Product | null;
    onSuccess?: () => void;
}

export function DeleteProductDialog({ isOpen, setIsOpen, productToDelete, onSuccess }: DeleteDialogProps) {
    const { delete: deleteProduct, processing } = useForm();

    const handleDelete = () => {
        if (!productToDelete) return;
        deleteProduct(ProductController.destroy.url({ product: productToDelete.id }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsOpen(false);
                toast.success(`Producto "${productToDelete.name}" eliminado.`);
                onSuccess?.();
            },
            onError: () => toast.error('No se pudo eliminar el producto.'),
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" /> ¿Confirmar Eliminación?
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el producto <strong>{productToDelete?.name}</strong> y todas sus variantes.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Sí, eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}