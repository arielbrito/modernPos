import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { urlWith } from "@/lib/urlWith"; // mismo helper que ya usas

type Paper = "letter" | "a4";

interface Props {
    purchaseId: number;
}

export function PrintControls({ purchaseId }: Props) {
    const [paper, setPaper] = useState<Paper>("letter");
    const [copy, setCopy] = useState(false);

    useEffect(() => {
        const p = localStorage.getItem("po.print.paper");
        const c = localStorage.getItem("po.print.copy");
        if (p === "a4" || p === "letter") setPaper(p);
        if (c === "1") setCopy(true);
    }, []);
    useEffect(() => { localStorage.setItem("po.print.paper", paper); }, [paper]);
    useEffect(() => { localStorage.setItem("po.print.copy", copy ? "1" : "0"); }, [copy]);

    const base = PurchaseController.print.url({ purchase: purchaseId }); // Wayfinder
    const printUrl = urlWith(base, paper, copy, false);
    const downloadUrl = urlWith(base, paper, copy, true);

    return (
        <div className="flex items-center gap-2">
            {/* <Select value={paper} onValueChange={(v) => setPaper(v as Paper)}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Tamaño" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                </SelectContent>
            </Select> */}

            <label className="flex items-center gap-2 text-sm">
                <Checkbox className="bg-muted-foreground" checked={copy} onCheckedChange={(v) => setCopy(Boolean(v))} />
                Copia
            </label>

            <Button asChild variant="outline" title="imprimir" className="pos-button-primary">
                <a href={printUrl} target="_blank" rel="noopener noreferrer">
                    <Printer className="h-4 w-4 mr-2 text-accent-foreground" />

                </a>
            </Button>

            <Button asChild variant="secondary">
                <a href={downloadUrl}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                </a>
            </Button>
        </div>
    );
}
