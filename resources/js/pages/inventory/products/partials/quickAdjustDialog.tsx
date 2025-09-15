import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ProductStockController from '@/actions/App/Http/Controllers/Inventory/ProductStockController';

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    variantId: number;
    stores: { id: number; name: string }[];
};

export default function QuickAdjustDialog({ open, onOpenChange, variantId, stores }: Props) {
    const { data, setData, post, processing, reset } = useForm({
        store_id: '',
        type: 'adjustment_in',
        quantity: '',
        unit_price: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(ProductStockController.adjust.url({ variant: variantId }), {
            onSuccess: () => { reset(); onOpenChange(false); },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ajustar stock</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <Label>Tienda</Label>
                        <Select value={data.store_id} onValueChange={(v) => setData('store_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Tipo</Label>
                            <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="purchase_entry">Entrada (Compra)</SelectItem>
                                    <SelectItem value="sale_exit">Salida (Venta)</SelectItem>
                                    <SelectItem value="adjustment_in">Ajuste +</SelectItem>
                                    <SelectItem value="adjustment_out">Ajuste −</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Cantidad</Label>
                            <Input type="number" step="0.01" value={data.quantity} onChange={e => setData('quantity', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <Label>Precio unitario (opcional)</Label>
                        <Input type="number" step="0.0001" value={data.unit_price} onChange={e => setData('unit_price', e.target.value)} />
                    </div>

                    <div>
                        <Label>Notas</Label>
                        <Input value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>Guardar</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
