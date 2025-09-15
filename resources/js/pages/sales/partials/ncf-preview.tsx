import * as React from "react";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Rutas API (Wayfinder)
import NcfApiController from "@/actions/App/Http/Controllers/Fiscal/NcfApiController";

type Props = {
    storeId: number;                // tienda activa
    customerId?: number | null;     // cliente seleccionado (para default B01/B02)
    availableTypes?: Array<{ code: string; name: string }>; // tipos habilitados en esta tienda (opcional)
    value?: string;                 // tipo actual (controlado externo si quieres)
    onChange?: (type: string) => void;
};

export function NCFPreview({ storeId, customerId = null, availableTypes, value, onChange }: Props) {
    const [type, setType] = React.useState<string>(value ?? "B02");
    const [preview, setPreview] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const setTypeBoth = (t: string) => {
        setType(t);
        onChange?.(t);
    };

    // default según cliente
    React.useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const url = NcfApiController.defaultType.url({
                    query: { customer_id: customerId ?? "" }
                });
                const res = await fetch(url, { credentials: "same-origin" });
                const json = await res.json();
                if (!ignore && json?.type) {
                    setTypeBoth(json.type);
                }
            } catch { /* nada */ }
        })();
        return () => { ignore = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId]);

    const refresh = React.useCallback(async (_type?: string) => {
        setLoading(true);
        try {
            const url = NcfApiController.preview.url({
                query: { store_id: storeId, type: _type ?? type }
            });
            const res = await fetch(url, { credentials: "same-origin" });
            const json = await res.json();
            setPreview(json?.ncf ?? null);
        } catch {
            toast.error("No se pudo obtener el próximo NCF");
        } finally {
            setLoading(false);
        }
    }, [storeId, type]);

    // refrescar cuando cambie el tipo
    React.useEffect(() => { refresh(type); }, [type, refresh]);

    React.useEffect(() => {
        if (value && value !== type) setTypeBoth(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const options = availableTypes ?? [
        { code: "B02", name: "Consumidor Final" },
        { code: "B01", name: "Crédito Fiscal" },
    ];

    return (
        <div className="flex items-center gap-3">
            <div className="min-w-[260px]">
                <label className="mb-1 block text-sm font-medium">Tipo de NCF</label>
                <Select value={type} onValueChange={(v) => setTypeBoth(v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>
                        {options.map(o => <SelectItem key={o.code} value={o.code}>{o.name} ({o.code})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="mt-6 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Próximo:</span>
                {preview
                    ? <Badge variant="outline" className="font-mono">{preview}</Badge>
                    : <Badge variant="secondary">—</Badge>}
                <Button type="button" size="icon" variant="ghost" onClick={() => refresh(type)} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
            </div>
        </div>
    );
}
