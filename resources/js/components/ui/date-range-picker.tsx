"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from 'date-fns/locale'
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    from: Date;
    to: Date;
    onUpdate: (range: DateRange) => void;
}

export function DateRangePicker({ className, from, to, onUpdate }: DateRangePickerProps) {
    const [date, setDate] = React.useState<DateRange | undefined>({ from, to });
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // Usamos un segundo useEffect para llamar a onUpdate solo cuando las fechas son válidas.
    React.useEffect(() => {
        if (date?.from && date?.to) {
            onUpdate(date);
        }
    }, [date]);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from && date.to ? (
                            <>
                                {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                {format(date.to, "LLL dd, y", { locale: es })}
                            </>
                        ) : (
                            <span>Selecciona un rango</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={1}
                        locale={es}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}