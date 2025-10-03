// resources/js/pages/purchases/returns/create.tsx
import * as React from "react";
import { Head, useForm } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Save } from "lucide-react";
import PurchaseReturnController from "@/actions/App/Http/Controllers/Inventory/PurchaseReturnController";

type PurchaseLite = { id: number; code: string; store?: { id: number; name: string }; supplier?: { id: number; name: string } };
type ItemRow = {
    purchase_item_id: number;
    product_variant_id: number;
    sku: string;
    name: string;
    qty_received: number;
    unit_cost: number;
    max_returnable: number;
    quantity: number | string; // a devolver
};

interface FormData {
    purchase_id: number | null;
    return_date: string;
    notes: string;
    items: ItemRow[];
}

export default function CreatePurchaseReturn() {
    const form = useForm<FormData>({
        purchase_id: null,
        return_date: new Date().toISOString().slice(0, 10),
        notes: "",
        items: [],
    });

    const [term, setTerm] = React.useState("");
    const [results, setResults] = React.useState<PurchaseLite[]>([]);
    const [loadingSearch, setLoadingSearch] = React.useState(false);
    const [selected, setSelected] = React.useState<PurchaseLite | null>(null);

    const doSearch = async () => {
        if (term.trim().length < 2) return;
        setLoadingSearch(true);
        try {
            const res = await fetch(PurchaseReturnController.searchPurchases.url() + `?term=${encodeURIComponent(term)}`);
            const data = await res.json();
            setResults(data);
        } finally {
            setLoadingSearch(false);
        }
    };

    const loadItems = async (purchaseId: number) => {
        const res = await fetch(PurchaseReturnController.returnableItems.url({ purchase: purchaseId }));
        const data = await res.json();
        setSelected(data.purchase);
        form.setData('purchase_id', data.purchase.id);
        form.setData('items', data.items.map((it: any) => ({
            ...it,
            quantity: "", // el usuario coloca cuánto devuelve
        })));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const rows = form.data.items
            .filter(r => Number(r.quantity) > 0)
            .map(r => ({
                purchase_item_id: r.purchase_item_id,
                product_variant_id: r.product_variant_id,
                quantity: Number(r.quantity),
            }));

        if (!form.data.purchase_id) {
            toast.error("Selecciona una compra.");
            return;
        }
        if (rows.length === 0) {
            toast.error("Agrega al menos una línea con cantidad > 0.");
            return;
        }

        form.transform((data) => ({
            purchase_id: data.purchase_id,
            return_date: data.return_date,
            notes: data.notes,
            items: rows,
        }));

        form.post(PurchaseReturnController.store.url(), {
            onSuccess: () => toast.success("Devolución registrada."),
            onError: (errs: any) => toast.error("Error al guardar.", { description: Object.values(errs).flat().join(" ") }),
        });
    };

    return (
        <AppLayout>
            <Head title="Nueva Devolución" />
            <form onSubmit={submit} className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Nueva Devolución de Compra</h1>
                    <Button type="submit" disabled={form.processing}>
                        <Save className="h-4 w-4 mr-2" /> Guardar
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Seleccionar Compra</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2">
                            <Input placeholder="Buscar por código..." value={term} onChange={e => setTerm(e.target.value)} />
                            <Button type="button" onClick={doSearch} disabled={loadingSearch}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        {results.length > 0 && (
                            <div className="border rounded-md divide-y">
                                {results.map(r => (
                                    <div key={r.id} className="p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-mono font-semibold">{r.code}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {r.store?.name} · {r.supplier?.name}
                                            </div>
                                        </div>
                                        <Button type="button" variant="outline" onClick={() => loadItems(r.id)}>
                                            <Plus className="h-4 w-4 mr-2" /> Usar esta compra
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="return_date">Fecha</Label>
                                <Input id="return_date" type="date" value={form.data.return_date} onChange={e => form.setData('return_date', e.target.value)} />
                                {form.errors.return_date && <p className="text-sm text-red-600">{form.errors.return_date}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Input id="notes" value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Ítems a Devolver</CardTitle></CardHeader>
                    <CardContent>
                        {form.data.items.length === 0 ? (
                            <div className="text-muted-foreground">Busca y selecciona una compra para cargar sus ítems recibidos.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto / SKU</TableHead>
                                        <TableHead className="text-right">Recibido</TableHead>
                                        <TableHead className="text-right">Máx. Dev.</TableHead>
                                        <TableHead className="text-right">Cantidad a devolver</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {form.data.items.map((it, i) => {
                                        const max = Number(it.max_returnable) || 0;
                                        const val = String(it.quantity ?? "");
                                        const invalid = Number(val) > max;
                                        return (
                                            <TableRow key={i} className={invalid ? "bg-red-50" : ""}>
                                                <TableCell>
                                                    <div className="font-medium">{it.name}</div>
                                                    <div className="text-xs text-muted-foreground">{it.sku}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{Number(it.qty_received).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{max.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={val}
                                                        onChange={e => form.setData('items', form.data.items.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))}
                                                        className="h-8 text-right"
                                                    />
                                                    {invalid && <div className="text-xs text-red-600 mt-1">No puede exceder {max.toFixed(2)}</div>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
}
