import { useState } from 'react';
import { CartItem } from '@/types'; // Asegúrate de exportar tu tipo CartItem desde '@/types'
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

interface PaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    cartItems: CartItem[];
    total: number;
    onSubmit: (paymentMethod: string) => void;
    isProcessing: boolean;
}

export function PaymentDialog({ isOpen, setIsOpen, total, onSubmit, isProcessing }: PaymentDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountReceived, setAmountReceived] = useState(0);

    const change = amountReceived > total ? amountReceived - total : 0;

    const handleSubmit = () => {
        onSubmit(paymentMethod);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Procesar Pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="text-center">
                        <Label>Total a Pagar</Label>
                        <p className="text-4xl font-bold">${total.toFixed(2)}</p>
                    </div>
                    <div>
                        <Label>Método de Pago</Label>
                        <RadioGroup defaultValue="cash" onValueChange={setPaymentMethod} className="flex gap-4 pt-2">
                            <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent"><RadioGroupItem value="cash" /> Efectivo</Label>
                            <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent"><RadioGroupItem value="card" /> Tarjeta</Label>
                            <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent"><RadioGroupItem value="transfer" /> Transferencia</Label>
                        </RadioGroup>
                    </div>
                    {paymentMethod === 'cash' && (
                        <div>
                            <Label htmlFor="amount_received">Monto Recibido</Label>
                            <Input id="amount_received" type="number" onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)} />
                            <div className="text-right mt-2 text-lg">
                                Cambio: <span className="font-bold">${change.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isProcessing} className="w-full h-12 text-lg">
                        {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}