import * as React from "react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { ChevronsUpDown, Check, X, Loader2 } from "lucide-react";

export type ItemOption = {
    value: number | string;
    label: string;
    [key: string]: any;
};

interface AsyncSmartComboboxProps {
    searchUrl: string;
    value: ItemOption | null;
    onChange: (value: ItemOption | null) => void;
    placeholder?: string;
    emptyLabel?: string;
    error?: string;
    disabled?: boolean;
    clearable?: boolean;
    className?: string;

    /** Extras para UX */
    autoCloseOnSelect?: boolean;                // default: true
    onEnterSelected?: () => void;               // callback al confirmar con Enter
    refTrigger?: React.RefObject<HTMLButtonElement | null>; // para enfoque externo (Alt+N, etc.)
}

/** Debounce simple */
const useDebounce = (value: string, delay: number) => {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
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
    autoCloseOnSelect = true,
    onEnterSelected,
    refTrigger,
}: AsyncSmartComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [results, setResults] = React.useState<ItemOption[]>([]);

    const debounced = useDebounce(searchTerm, 300);

    React.useEffect(() => {
        if (debounced.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            try {
                const { data } = await axios.get(searchUrl, { params: { term: debounced } });
                // Transform -> variantes
                const formatted: ItemOption[] = data.flatMap((p: any) =>
                    (p.variants || []).map((v: any) => ({
                        value: v.id,
                        label: `${p.name} ${v.attributes ? `(${Object.values(v.attributes).join(" ")})` : ""} (SKU: ${v.sku})`,
                        sku: v.sku,
                        cost_price: v.cost_price,
                        stock_quantity: v.stock_quantity,
                    }))
                );
                if (!cancelled) setResults(formatted);
            } catch (e) {
                if (!cancelled) toast.error("Error al buscar productos.");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [debounced, searchUrl]);

    const handleSelect = (item: ItemOption | null) => {
        onChange(item);
        if (autoCloseOnSelect) {
            // limpia texto de búsqueda y cierra
            setSearchTerm("");
            setOpen(false);
        }
    };

    const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // Si hay exactamente 1 coincidencia o si hay selección en cmdk, elige la primera
            if (results.length > 0) {
                handleSelect(results[0]);
                onEnterSelected?.();
            }
        }
    };

    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={refTrigger as any}
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between",
                            !value && "text-muted-foreground",
                            error && "border-destructive",
                            className
                        )}
                    >
                        {value ? value.label : placeholder}
                        <span className="flex items-center gap-1">
                            {clearable && value && !disabled && (
                                <X
                                    className="h-4 w-4 opacity-60 hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(null);
                                    }}
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
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            onKeyDown={onKeyDownInput}
                            autoFocus
                        />
                        <CommandList>
                            {isLoading && (
                                <div className="p-2 flex justify-center items-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {!isLoading && results.length === 0 && searchTerm.length > 1 && (
                                <CommandEmpty>{emptyLabel}</CommandEmpty>
                            )}
                            <CommandGroup>
                                {results.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        value={item.label}
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
