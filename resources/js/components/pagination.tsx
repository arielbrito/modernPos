import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
    className?: string;
}

export function Pagination({ links, className }: PaginationProps) {
    if (links.length <= 3) {
        return null; // No mostrar si solo hay 'prev', 'next' y una página
    }

    return (
        <nav className={cn('flex items-center justify-center gap-2', className)}>
            {links.map((link, index) => {
                // Renderizar botones de "Anterior" y "Siguiente" con íconos
                if (index === 0 || index === links.length - 1) {
                    return (
                        <Button
                            key={link.label}
                            asChild
                            variant="outline"
                            size="icon"
                            disabled={!link.url}
                        >
                            <Link href={link.url || '#'}>
                                {index === 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Link>
                        </Button>
                    );
                }

                // Renderizar botones de número de página
                return (
                    <Button
                        key={link.label}
                        asChild
                        variant={link.active ? 'default' : 'outline'}
                        size="icon"
                        disabled={!link.url}
                    >
                        <Link href={link.url || '#'}>{link.label}</Link>
                    </Button>
                );
            })}
        </nav>
    );
}