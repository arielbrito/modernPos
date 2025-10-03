import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import PurchaseController from "@/actions/App/Http/Controllers/Inventory/PurchaseController";
import { withQuery } from "@/lib/withQuery";

interface Props {
    purchase: string;
}

export function ExportButtons({ purchase }: Props) {
    const csvUrl = withQuery(PurchaseController.exportIndexCsv.url(), { search: filters.search, status: filters.status });
    const xlsxUrl = withQuery(PurchaseController.exportIndexXlsx.url(), { search: filters.search, status: filters.status });

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
