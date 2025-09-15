import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

// Hacemos que la prop `preserveScroll` sea opcional
interface PaginatorProps {
    links: PaginationLink[];
    className?: string;
    preserveScroll?: boolean;
}

export function Paginator({ links, className, preserveScroll = false }: PaginatorProps) {
    // Si no hay links o solo hay "prev" y "next", no renderizar nada.
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className={cn('flex items-center justify-center gap-1', className)}>
            {links.map((link, index) => {
                // El label viene con HTML entities (ej: &laquo;), usamos dangerouslySetInnerHTML
                const label = link.label;

                // Botón "Anterior"
                if (index === 0) {
                    return (
                        <Button key="prev" asChild variant="outline" size="icon" disabled={!link.url}>
                            <Link href={link.url || '#'} preserveScroll={preserveScroll}>
                                <span className="sr-only">Anterior</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    );
                }

                // Botón "Siguiente"
                if (index === links.length - 1) {
                    return (
                        <Button key="next" asChild variant="outline" size="icon" disabled={!link.url}>
                            <Link href={link.url || '#'} preserveScroll={preserveScroll}>
                                <span className="sr-only">Siguiente</span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    );
                }

                // Botones de número de página
                // No renderizar si es un separador "..."
                if (label === '...') {
                    return <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">...</span>
                }

                return (
                    <Button
                        key={label}
                        asChild
                        variant={link.active ? 'default' : 'outline'}
                        size="icon"
                        disabled={!link.url}
                    >
                        <Link href={link.url || '#'} preserveScroll={preserveScroll}>{label}</Link>
                    </Button>
                );
            })}
        </nav>
    );
}