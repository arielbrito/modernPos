import * as React from 'react';
import { usePage, Link } from '@inertiajs/react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type NavItem, type SharedProps } from '@/types';
import { Dot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './ui/button';

// --- 1. LÓGICA DE PERMISOS ---
function filterNavItems(items: NavItem[], userPermissions: Set<string>): NavItem[] {
    return items
        .map(item => ({ ...item }))
        .filter(item => {
            if (item.children) {
                item.children = filterNavItems(item.children, userPermissions);
                return item.children.length > 0 || !item.permission;
            }
            if (item.isSection) return true;
            if (!item.permission) return true;

            return userPermissions.has(item.permission);
        });
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedProps>();
    const { auth } = page.props;
    const { open: sidebarOpen, isMobile } = useSidebar();

    const userPermissions = React.useMemo(() => new Set(auth.permissions || []), [auth.permissions]);
    const accessibleItems = React.useMemo(() => filterNavItems(items, userPermissions), [items, userPermissions]);

    const isUrlActive = (href?: NavItem['href']): boolean => {
        if (!href) return false;
        const url = typeof href === 'string' ? href : (href as { url: string }).url;
        return page.url.startsWith(url);
    };

    const defaultOpenItems = React.useMemo(() =>
        accessibleItems
            .filter(item => item.children?.some(child => isUrlActive(child.href)))
            .map(item => item.title),
        [accessibleItems, page.url]
    );

    // --- 2. SUB-COMPONENTES MEJORADOS ---

    // Componente para mostrar badges de notificación
    const NotificationBadge = ({ count }: { count?: number }) => {
        if (!count || count === 0) return null;

        return (
            <Badge
                variant="destructive"
                className="h-5 min-w-[20px] px-1.5 text-xs font-medium animate-pulse"
            >
                {count > 99 ? '99+' : count}
            </Badge>
        );
    };

    // Componente mejorado para botones de menú
    const MenuButton = ({ item, isChild = false }: { item: NavItem, isChild?: boolean }) => {
        const isActive = isUrlActive(item.href);
        const hasNotifications = item.notificationCount && item.notificationCount > 0;

        const buttonContent = (
            <div className={cn(
                "flex items-center gap-3 w-full transition-all duration-200",
                !sidebarOpen && !isMobile && "justify-center"
            )}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isChild ? (
                        <Dot className={cn(
                            "h-4 w-4 shrink-0 -ml-1 transition-colors",
                            isActive && "text-primary"
                        )} />
                    ) : (
                        item.icon && (
                            <item.icon className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                isActive && "text-primary",
                                hasNotifications && "text-orange-500"
                            )} />
                        )
                    )}

                    {(sidebarOpen || isMobile) && (
                        <span className={cn(
                            "truncate transition-colors font-medium",
                            isActive && "text-primary font-semibold"
                        )}>
                            {item.title}
                        </span>
                    )}
                </div>

                {/* Badges y estados a la derecha */}
                {(sidebarOpen || isMobile) && (
                    <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                            <Badge
                                variant={item.badge.variant || 'secondary'}
                                className="h-5 px-2 text-xs font-medium"
                            >
                                {item.badge.text}
                            </Badge>
                        )}
                        <NotificationBadge count={item.notificationCount} />
                        {item.isNew && (
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </div>
                )}
            </div>
        );

        // Modo colapsado: mostrar tooltip
        if (!sidebarOpen && !isMobile) {
            return (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={item.href ?? '#'}
                                className={cn(
                                    buttonVariants({
                                        variant: isActive ? 'default' : 'ghost',
                                        size: 'icon'
                                    }),
                                    "h-9 w-9 relative hover:scale-105 transition-all duration-200",
                                    isActive && "shadow-md"
                                )}
                            >
                                {item.icon && <item.icon className="h-4 w-4" />}
                                {hasNotifications && (
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                                )}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                            <div className="flex items-center gap-2">
                                {item.title}
                                <NotificationBadge count={item.notificationCount} />
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        // Modo expandido
        return (
            <Link
                href={item.href ?? '#'}
                className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    "w-full justify-start h-9 transition-all duration-200 hover:scale-[1.02] hover:bg-accent",
                    isActive && "bg-primary/10 text-primary border-r-2 border-primary shadow-sm",
                    hasNotifications && "border-l-2 border-orange-500"
                )}
            >
                {buttonContent}
            </Link>
        );
    };

    // Componente para grupos con hijos
    const MenuGroup = ({ item }: { item: NavItem }) => {
        const isGroupActive = !!item.children?.some(child => isUrlActive(child.href));
        const hasGroupNotifications = item.children?.some(child => child.notificationCount && child.notificationCount > 0);

        // En modo colapsado, mostrar como tooltip con los hijos
        if (!sidebarOpen && !isMobile) {
            return (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                buttonVariants({ variant: isGroupActive ? 'secondary' : 'ghost', size: 'icon' }),
                                "h-9 w-9 relative hover:scale-105 transition-all duration-200 cursor-pointer",
                                isGroupActive && "shadow-md"
                            )}>
                                {item.icon && <item.icon className="h-4 w-4" />}
                                {hasGroupNotifications && (
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full border-2 border-background animate-pulse" />
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium p-0">
                            <div className="p-2 space-y-1">
                                <div className="font-semibold text-sm mb-2 px-1">{item.title}</div>
                                {item.children?.map((child) => {
                                    const childActive = isUrlActive(child.href);
                                    return (
                                        <Link
                                            key={child.title}
                                            href={child.href ?? '#'}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors",
                                                childActive && "bg-primary/10 text-primary font-medium"
                                            )}
                                        >
                                            {child.icon && <child.icon className="h-3.5 w-3.5" />}
                                            <span className="truncate">{child.title}</span>
                                            <NotificationBadge count={child.notificationCount} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        // Modo expandido (accordion normal)
        return (
            <AccordionItem value={item.title} className="border-none">
                <AccordionTrigger className={cn(
                    "hover:no-underline hover:bg-accent rounded-md px-3 py-2 text-sm font-medium w-full justify-between transition-all duration-200 group",
                    isGroupActive && "text-primary bg-primary/5",
                    hasGroupNotifications && "border-l-2 border-orange-500"
                )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.icon && (
                            <item.icon className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                isGroupActive && "text-primary",
                                hasGroupNotifications && "text-orange-500"
                            )} />
                        )}
                        {(sidebarOpen || isMobile) && (
                            <span className="truncate">{item.title}</span>
                        )}
                    </div>

                    {(sidebarOpen || isMobile) && (
                        <div className="flex items-center gap-2">
                            {item.badge && (
                                <Badge variant={item.badge.variant || 'secondary'} className="h-5 px-2 text-xs">
                                    {item.badge.text}
                                </Badge>
                            )}
                            {hasGroupNotifications && (
                                <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                            )}
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                        </div>
                    )}
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-0">
                    <SidebarMenu className="ml-4 pl-3 border-l border-border/30 space-y-0.5">
                        {item.children?.map((child) => (
                            <SidebarMenuItem key={child.title} className="p-0">
                                <MenuButton item={child} isChild />
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </AccordionContent>
            </AccordionItem>
        );
    };

    // --- 3. RENDERIZADO PRINCIPAL ---
    return (
        <TooltipProvider>
            <Accordion type="multiple" defaultValue={defaultOpenItems} className="w-full space-y-1 px-2">
                {accessibleItems.map((item) => {
                    // Secciones
                    if (item.isSection) {
                        return (
                            <h4
                                key={item.title}
                                className={cn(
                                    "px-3 pt-4 pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-all",
                                    !sidebarOpen && !isMobile && "text-center"
                                )}
                            >
                                {(sidebarOpen || isMobile) ? item.title : '•••'}
                            </h4>
                        );
                    }

                    // Grupos con hijos
                    if (item.children?.length) {
                        return <MenuGroup key={item.title} item={item} />;
                    }

                    // Items simples
                    return (
                        <SidebarMenuItem key={item.title} className="p-0">
                            <MenuButton item={item} />
                        </SidebarMenuItem>
                    );
                })}
            </Accordion>
        </TooltipProvider>
    );
}