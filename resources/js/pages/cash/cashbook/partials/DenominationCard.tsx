import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Banknote, Coins, Plus, Minus } from 'lucide-react';
import type { Denomination } from '@/types';

const money = (n: number, c = "DOP") => new Intl.NumberFormat("es-DO", { style: "currency", currency: c }).format(Number(n || 0));

interface DenominationCardProps {
    denomination: Denomination;
    quantity: number;
    onQuantityChange: (newQty: number) => void;
}

export function DenominationCard({ denomination: d, quantity, onQuantityChange }: DenominationCardProps) {
    const [inputValue, setInputValue] = useState(String(quantity || ''));
    const subtotal = quantity * d.value;

    useEffect(() => {
        // Sincroniza el input si la cantidad cambia desde fuera (ej. al limpiar)
        setInputValue(String(quantity || ''));
    }, [quantity]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value); // Permite al usuario escribir libremente
    };

    const handleBlur = () => {
        // Al salir del input, formatea y actualiza el estado principal
        const numValue = Math.max(0, parseInt(inputValue, 10) || 0);
        setInputValue(String(numValue));
        onQuantityChange(numValue);
    };

    const isHighValue = d.value >= 1000;
    const hasQuantity = quantity > 0;

    return (
        <Card className={`transition-all duration-200 ${hasQuantity ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50'}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        {d.kind === "bill" ? <Banknote className={`h-5 w-5 ${isHighValue ? 'text-green-600' : 'text-blue-600'}`} /> : <Coins className="h-5 w-5 text-amber-600" />}
                        <Badge variant={d.kind === "bill" ? "default" : "secondary"} className="text-xs">{d.kind === "bill" ? "Billete" : "Moneda"}</Badge>
                    </div>
                    <div className={`font-bold text-lg ${isHighValue ? 'text-green-600' : ''}`}>{money(d.value, d.currency_code)}</div>
                </CardTitle>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-2">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => onQuantityChange(Math.max(0, quantity - 1))} disabled={quantity === 0}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="h-10 text-center text-lg font-medium [appearance:textfield]"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                    />
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => onQuantityChange(quantity + 1)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal:</span>
                    <span className={`font-bold text-lg tabular-nums ${hasQuantity ? 'text-primary' : 'text-muted-foreground'}`}>{money(subtotal, d.currency_code)}</span>
                </div>
            </CardContent>
        </Card>
    );
}