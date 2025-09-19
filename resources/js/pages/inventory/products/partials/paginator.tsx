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

interface PaginatorProps {
    links: PaginationLink[];
    className?: string;
    preserveState?: boolean; // Prop para controlar el estado
}

export function Paginator({ links, className, preserveState = true }: PaginatorProps) {
    if (!links || links.length <= 3) {
        return null;
    }

    // Usamos una función para no repetir el <Link>
    const renderLink = (link: PaginationLink, children: React.ReactNode) => (
        <Link
            href={link.url || '#'}
            preserveState={preserveState} // <-- Clave para mantener los filtros
            preserveScroll // <-- Clave para no saltar al tope de la página
            className={!link.url ? 'pointer-events-none' : ''}
        >
            {children}
        </Link>
    );

    return (
        <nav className={cn('flex items-center justify-center gap-1', className)}>
            {links.map((link, index) => {
                // El `label` de Laravel a veces contiene HTML, lo limpiamos para usar íconos
                const isPrev = index === 0;
                const isNext = index === links.length - 1;
                const isEllipsis = link.label.includes('...');

                if (isEllipsis) {
                    return <span key={`ellipsis-${index}`} className="px-3 py-1 text-muted-foreground">...</span>;
                }

                return (
                    <Button
                        key={link.label}
                        asChild
                        variant={link.active ? 'default' : 'outline'}
                        size="icon"
                        disabled={!link.url}
                        aria-label={isPrev ? 'Página anterior' : isNext ? 'Página siguiente' : `Página ${link.label}`}
                    >
                        {renderLink(
                            link,
                            isPrev
                                ? <ChevronLeft className="h-4 w-4" />
                                : isNext
                                    ? <ChevronRight className="h-4 w-4" />
                                    : link.label
                        )}
                    </Button>
                );
            })}
        </nav>
    );
}