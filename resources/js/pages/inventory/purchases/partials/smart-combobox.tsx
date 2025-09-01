import * as React from "react";
import { cn } from "@/lib/utils";

// UI
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Icons
import { ChevronsUpDown, Check, X } from "lucide-react";

// Types
export type ItemOption = {
    value: number | string;
    label: string;
};

interface SmartComboboxProps {
    items: ItemOption[];
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    placeholder?: string;
    emptyLabel?: string;
    error?: string;
    disabled?: boolean;
    clearable?: boolean;           // <- permite limpiar selección
    nullLabel?: string;            // <- etiqueta para opción nula
    className?: string;            // <- estilos extra para el botón
}

export function SmartCombobox({
    items,
    value,
    onChange,
    placeholder = "Seleccionar…",
    emptyLabel = "Sin resultados",
    error,
    disabled = false,
    clearable = false,
    nullLabel = "— Ninguno —",
    className,
}: SmartComboboxProps) {
    const [open, setOpen] = React.useState(false);

    // Normaliza para comparar string vs number sin errores
    const norm = (v: number | string | null) => (v === null ? null : String(v));
    const selected = items.find((i) => norm(i.value) === norm(value)) || null;

    const handleSelect = (val: number | string | null) => {
        onChange(val);
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
                        aria-expanded={open}
                        aria-invalid={!!error}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between",
                            !selected && "text-muted-foreground",
                            error && "border-destructive",
                            className
                        )}
                    >
                        {selected ? selected.label : placeholder}
                        <span className="flex items-center gap-1">
                            {clearable && selected && !disabled && (
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
                        <CommandInput placeholder="Buscar…" autoFocus />
                        <CommandEmpty>{emptyLabel}</CommandEmpty>
                        <CommandList>
                            <CommandGroup>
                                {clearable && (
                                    <CommandItem
                                        value={nullLabel}
                                        onSelect={() => handleSelect(null)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === null ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {nullLabel}
                                    </CommandItem>
                                )}

                                {items.map((item) => (
                                    <CommandItem
                                        key={String(item.value)}
                                        // cmdk busca sobre `value`, pero mostramos `label`
                                        value={item.label}
                                        onSelect={() => handleSelect(item.value)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                norm(value) === norm(item.value) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
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
