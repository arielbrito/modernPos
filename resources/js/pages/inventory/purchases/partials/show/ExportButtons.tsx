import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";

interface Props {
    purchaseId: number;
}

export function ExportButtons({ purchaseId }: Props) {
    const csvUrl = PurchaseController.exportCsv.url({ purchase: purchaseId });
    const xlsxUrl = PurchaseController.exportXlsx.url({ purchase: purchaseId });

    return (
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
                <a href={csvUrl}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                </a>
            </Button>
            <Button asChild variant="outline">
                <a href={xlsxUrl}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                </a>
            </Button>
        </div>
    );
}
