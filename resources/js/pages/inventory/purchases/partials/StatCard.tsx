import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    className?: string;
    isLoading?: boolean;
    /** Mostrar tendencia: “up”/“down”/undefined */
    trend?: "up" | "down";
    /** Texto opcional para la tendencia, ej. “+12% vs. mes pasado” */
    trendLabel?: string;
    /** Formateador opcional para el valor (money, intl, etc.) */
    formatValue?: (v: string | number) => string;
}

export const StatCard = ({
    title,
    value,
    icon,
    description,
    className,
    isLoading = false,
    trend,
    trendLabel,
    formatValue,
}: Props) => {
    const displayValue = formatValue ? formatValue(value) : String(value);

    return (
        <Card className={cn(className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {/* normalizamos el icono a 18px aprox */}
                    <div className="[&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">{icon}</div>
                </div>
            </CardHeader>

            <CardContent>
                <div
                    className={cn(
                        "text-2xl font-bold tabular-nums",
                        isLoading && "opacity-60"
                    )}
                    aria-live="polite"
                >
                    {isLoading ? "—" : displayValue}
                </div>

                {/* Línea de tendencia si aplica */}
                {trend && (
                    <div
                        className={cn(
                            "mt-1 flex items-center gap-1 text-xs font-medium",
                            trend === "up" ? "text-green-600" : "text-red-600"
                        )}
                    >
                        {trend === "up" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        <span>{trendLabel ?? (trend === "up" ? "Al alza" : "A la baja")}</span>
                    </div>
                )}

                {/* Descripción secundaria */}
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
};
