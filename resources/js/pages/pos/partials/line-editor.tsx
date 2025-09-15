import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LineMeta } from '../libs/pos-types';
import { TAX_OPTIONS } from '../libs/pos-constants';

interface LineEditorProps {
    meta?: LineMeta;
    onChange: (v: Partial<LineMeta>) => void;
}

export function LineEditor({ meta, onChange }: LineEditorProps) {
    const m = meta ?? {};

    return (
        <div className="grid gap-3 w-80">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <div className="text-xs mb-1">Desc %</div>
                    <Input
                        type="number"
                        step="0.01"
                        value={m.discount_percent ?? ""}
                        onChange={e => onChange({ discount_percent: e.target.value === "" ? null : Number(e.target.value), discount_amount: null })}
                    />
                </div>
                <div>
                    <div className="text-xs mb-1">Desc $</div>
                    <Input
                        type="number"
                        step="0.01"
                        value={m.discount_amount ?? ""}
                        onChange={e => onChange({ discount_amount: e.target.value === "" ? null : Number(e.target.value), discount_percent: null })}
                    />
                </div>
            </div>

            <div>
                <div className="text-xs mb-1">Impuesto</div>
                <select
                    className="w-full h-9 border rounded-md px-2 text-sm bg-background"
                    value={m.tax_code ?? ""}
                    onChange={(e) => {
                        const code = e.target.value || null;
                        const opt = TAX_OPTIONS.find(o => o.code === code!);
                        onChange({
                            tax_code: code,
                            tax_name: opt?.name ?? null,
                            tax_rate: opt?.rate ?? 0,
                        });
                    }}
                >
                    <option value="">Exento (0%)</option>
                    {TAX_OPTIONS.map(o => (
                        <option key={o.code} value={o.code}>
                            {o.name} ({Math.round(o.rate * 100)}%)
                        </option>
                    ))}
                </select>
            </div>

            <div className="text-right">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ discount_amount: null, discount_percent: null, tax_code: null, tax_name: null, tax_rate: null })}
                >
                    Limpiar
                </Button>
            </div>
        </div>
    );
}