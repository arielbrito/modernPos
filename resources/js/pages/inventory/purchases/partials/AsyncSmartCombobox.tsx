import * as React from "react";
import { cn } from "@/lib/utils";
import axios from "axios";

// UI
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";

// Icons
import { ChevronsUpDown, Check, X, Loader2 } from "lucide-react";

// Types - Ahora onChange devuelve el objeto completo
export type ItemOption = {
    value: number | string;
    label: string;
    [key: string]: any; // Permite propiedades extra como cost_price
};

interface AsyncSmartComboboxProps {
    searchUrl: string; // URL para buscar (ej. /api/products/search)
    value: ItemOption | null;
    onChange: (value: ItemOption | null) => void; // Devuelve el objeto completo
    placeholder?: string;
    emptyLabel?: string;
    error?: string;
    disabled?: boolean;
    clearable?: boolean;
    className?: string;
}

// Hook simple para debounce
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};


export function AsyncSmartCombobox({
    searchUrl,
    value,
    onChange,
    placeholder = "Buscar...",
    emptyLabel = "Sin resultados.",
    error,
    disabled = false,
    clearable = true,
    className,
}: AsyncSmartComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [results, setResults] = React.useState<ItemOption[]>([]);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    React.useEffect(() => {
        if (debouncedSearchTerm.length < 2) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(searchUrl, {
                    params: { term: debouncedSearchTerm }
                });

                // Asumimos que la API devuelve un array de objetos con `id` y `name`, etc.
                // Lo transformamos al formato ItemOption.
                const formattedResults = response.data.flatMap((p: any) =>
                    p.variants.map((v: any) => ({
                        value: v.id,
                        label: `${p.name} ${v.attributes ? `(${Object.values(v.attributes).join(' ')})` : ''} (SKU: ${v.sku})`,

                        // Campos adicionales que pasaremos al formulario:
                        sku: v.sku,
                        cost_price: v.cost_price,
                        stock_quantity: v.stock_quantity, // <-- ¡LA PIEZA QUE FALTABA!
                    }))
                );
                setResults(formattedResults);

            } catch (err) {
                console.error("Error fetching results:", err);
                toast.error("Error al buscar productos.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedSearchTerm, searchUrl]);

    const handleSelect = (selectedItem: ItemOption | null) => {
        onChange(selectedItem);
        setOpen(false);
    };

    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className={cn("w-full justify-between", !value && "text-muted-foreground", error && "border-destructive", className)}
                    >
                        {value ? value.label : placeholder}
                        <span className="flex items-center gap-1">
                            {clearable && value && !disabled && (
                                <X
                                    className="h-4 w-4 opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); onChange(null); }}
                                />
                            )}
                            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Buscar por SKU o nombre..."
                            onValueChange={setSearchTerm}
                        />
                        <CommandList>
                            {isLoading && (
                                <div className="p-2 flex justify-center items-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {!isLoading && results.length === 0 && searchTerm.length > 1 && <CommandEmpty>{emptyLabel}</CommandEmpty>}
                            <CommandGroup>
                                {results.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        value={item.label} // El valor de búsqueda
                                        onSelect={() => handleSelect(item)}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", value?.value === item.value ? "opacity-100" : "opacity-0")} />
                                        {item.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        </div>
    );
}