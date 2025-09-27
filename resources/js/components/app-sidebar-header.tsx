import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
    right,
}: {
    breadcrumbs?: BreadcrumbItemType[];
    right?: React.ReactNode;
}) {
    return (
        <header className="relative flex h-16 shrink-0 items-center gap-3 border-b-2 border-border/30 px-6 transition-all duration-300 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 bg-gradient-to-r from-background via-accent/10 to-background backdrop-blur-sm overflow-hidden">
            {/* Barra decorativa superior */}
            <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail opacity-80"></div>

            {/* Efecto de brillo sutil */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50"></div>

            <div className="relative flex items-center gap-3">
                <div className="relative group">
                    <div className="absolute -inset-2 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
                    <SidebarTrigger className="relative -ml-1 hover:bg-primary/15 hover:text-primary transition-all duration-200 rounded-lg p-2 hover:scale-110" />
                </div>

                <div className="relative">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="relative ml-auto flex items-center gap-3">
                {right}
            </div>

            {/* Sombra inferior sutil */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </header>
    );
}