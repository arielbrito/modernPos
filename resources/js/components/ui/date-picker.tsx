"use client"

import * as React from "react"
import { format, Locale } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  // Props básicas existentes
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;

  // Nuevas props para mayor flexibilidad
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  dateFormat?: string;
  locale?: Locale;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  calendarClassName?: string;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  name?: string;
  required?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Seleccione una fecha",
  className,
  disabled = false,
  readonly = false,
  clearable = true,
  minDate,
  maxDate,
  disabledDates = [],
  dateFormat = "PPP",
  locale = es,
  buttonVariant = "outline",
  calendarClassName,
  onOpenChange,
  id,
  name,
  required = false,
  label,
  error,
  helperText
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Manejador para limpiar la fecha
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
  }, [setDate])

  // Manejador para cambios en el estado del popover
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (disabled || readonly) return
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [disabled, readonly, onOpenChange])

  // Función para verificar si una fecha está deshabilitada
  const isDateDisabled = React.useCallback((dateToCheck: Date) => {
    // Verificar límites min/max
    if (minDate && dateToCheck < minDate) return true
    if (maxDate && dateToCheck > maxDate) return true

    // Verificar fechas específicamente deshabilitadas
    return disabledDates.some(disabledDate =>
      dateToCheck.toDateString() === disabledDate.toDateString()
    )
  }, [minDate, maxDate, disabledDates])

  // Wrapper para incluir label y mensajes de error si se proporcionan
  const datePickerContent = (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          name={name}
          type="button"
          variant={buttonVariant}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            readonly && "cursor-default",
            error && "border-destructive focus:ring-destructive",
            className
          )}
          aria-label={placeholder}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {date ? format(date, dateFormat, { locale }) : placeholder}
          </span>
          {clearable && date && !disabled && !readonly && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClear}
              aria-label="Limpiar fecha"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 border shadow-md", calendarClassName)} align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            setDate(newDate)
            setOpen(false)
          }}
          disabled={isDateDisabled}
          locale={locale}
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )

  // Si no hay label ni mensajes, devolver solo el picker
  if (!label && !error && !helperText) {
    return datePickerContent
  }

  // Si hay label o mensajes, envolver en un contenedor
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {datePickerContent}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
}

// Exportar también un hook personalizado para manejo de fecha con validación
export function useDatePicker(initialDate?: Date, validators?: {
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [date, setDate] = React.useState<Date | undefined>(initialDate)
  const [error, setError] = React.useState<string>("")

  const validateDate = React.useCallback((dateToValidate: Date | undefined) => {
    if (validators?.required && !dateToValidate) {
      setError("La fecha es requerida")
      return false
    }

    if (dateToValidate) {
      if (validators?.minDate && dateToValidate < validators.minDate) {
        setError(`La fecha debe ser posterior a ${format(validators.minDate, "PPP", { locale: es })}`)
        return false
      }

      if (validators?.maxDate && dateToValidate > validators.maxDate) {
        setError(`La fecha debe ser anterior a ${format(validators.maxDate, "PPP", { locale: es })}`)
        return false
      }
    }

    setError("")
    return true
  }, [validators])

  const handleSetDate = React.useCallback((newDate: Date | undefined) => {
    setDate(newDate)
    validateDate(newDate)
  }, [validateDate])

  return {
    date,
    setDate: handleSetDate,
    error,
    validate: () => validateDate(date),
    reset: () => {
      setDate(initialDate)
      setError("")
    }
  }
}