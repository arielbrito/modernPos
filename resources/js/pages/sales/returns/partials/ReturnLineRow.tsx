import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function ReturnLineRow({ line, qty, onChange }: {
    line: { id: number; name: string; sku: string; qty: number; remaining_qty: number };
    qty: number;
    onChange: (qty: number, reason?: string) => void;
}) {
    const [value, setValue] = useState<string>(qty ? String(qty) : '');
    const [reason, setReason] = useState<string>('');


    useEffect(() => { setValue(qty ? String(qty) : ''); }, [qty]);


    const max = line.remaining_qty;
    const onBlur = () => {
        const n = parseFloat(value || '0');
        if (!n || n <= 0) return onChange(0, reason);
        const clamped = Math.max(0, Math.min(n, max));
        if (clamped !== n) setValue(String(clamped));
        onChange(clamped, reason);
    };


    return (
        <div className="grid grid-cols-12 items-center gap-2 py-2 px-2 text-sm">
            <div className="col-span-5">
                <div className="font-medium">{line.name}</div>
                <div className="text-xs text-muted-foreground">SKU: {line.sku}</div>
                <div className="mt-2">
                    <Label htmlFor={`r-${line.id}`}>Motivo (opcional)</Label>
                    <Input id={`r-${line.id}`} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => onChange(parseFloat(value || '0') || 0, reason)} placeholder="Ej.: Producto defectuoso" />
                </div>
            </div>
            <div className="col-span-2 text-right">{line.qty}</div>
            <div className="col-span-2 text-right">{line.remaining_qty}</div>
            <div className="col-span-3">
                <Input type="number" min={0} step="0.001" value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} placeholder="0.000" />
            </div>
        </div>
    );
}