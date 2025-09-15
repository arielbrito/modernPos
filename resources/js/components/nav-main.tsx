/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { open: sidebarOpen, isMobile } = useSidebar();

    // Track which accordion items are open
    const [openItems, setOpenItems] = React.useState<string[]>([]);

    const isItemActive = (href: string | object | undefined): boolean => {
        if (!href) return false;
        const url = typeof href === 'string' ? href : ('url' in href ? href.url as string : '');
        return page.url.startsWith(url);
    };

    const isGroupActive = (children: NavItem[] = []): boolean => {
        return children.some(child => child.href && isItemActive(child.href));
    };

    // Initialize open items based on active groups
    React.useEffect(() => {
        const activeGroups = items
            .filter((item) => isGroupActive(item.children))
            .map((item) => item.title);
        setOpenItems(activeGroups);
    }, [items, page.url]);

    // Enhanced menu button with better collapsed state handling
    const MenuButton = ({
        item,
        isChild = false,
        isActive = false
    }: {
        item: NavItem;
        isChild?: boolean;
        isActive?: boolean;
    }) => {
        const buttonContent = (
            <div className={cn(
                "flex items-center gap-3 w-full",
                !sidebarOpen && !isMobile && "justify-center"
            )}>
                {item.icon && (
                    <item.icon
                        className={cn(
                            "h-4 w-4 shrink-0",
                            isActive && "text-primary",
                            isChild && "h-3 w-3"
                        )}
                    />
                )}
                {(sidebarOpen || isMobile) && (
                    <div className="flex items-center justify-between w-full">
                        <span className={cn(
                            "text-sm font-medium truncate",
                            isActive && "text-primary font-semibold",
                            isChild && "text-xs"
                        )}>
                            {item.title}
                        </span>
                        {item.badge && (
                            <Badge
                                variant={item.badge.variant || "secondary"}
                                className="ml-auto h-5 px-1.5 text-xs"
                            >
                                {item.badge.text}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        );

        // For collapsed sidebar, wrap single items in tooltip
        if (!sidebarOpen && !isMobile && !isChild) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                className={cn(
                                    "transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-primary",
                                    !sidebarOpen && "justify-center px-2"
                                )}
                            >
                                <Link href={item.href ?? '#'} prefetch>
                                    {buttonContent}
                                </Link>
                            </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                            {item.title}
                            {item.badge && (
                                <Badge
                                    variant={item.badge.variant || "secondary"}
                                    className="ml-2 h-4 px-1 text-xs"
                                >
                                    {item.badge.text}
                                </Badge>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return (
            <SidebarMenuButton
                asChild
                isActive={isActive}
                className={cn(
                    "transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-primary",
                    !sidebarOpen && !isMobile && "justify-center px-2"
                )}
            >
                <Link href={item.href ?? '#'} prefetch>
                    {buttonContent}
                </Link>
            </SidebarMenuButton>
        );
    };

    // Enhanced accordion trigger with better collapsed handling
    const AccordionTriggerEnhanced = ({
        item,
        children
    }: {
        item: NavItem;
        children: React.ReactNode;
    }) => {
        const isActive = isGroupActive(item.children);

        if (!sidebarOpen && !isMobile) {
            // For collapsed sidebar, show only icon with tooltip
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                            )}>
                                {item.icon && <item.icon className="h-4 w-4" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                            <div className="space-y-1">
                                <div className="font-medium">{item.title}</div>
                                {item.children && (
                                    <div className="space-y-1">
                                        {item.children.map((child) => (
                                            <div
                                                key={child.title}
                                                className={cn(
                                                    "text-xs text-muted-foreground",
                                                    child.href && isItemActive(child.href) && "text-primary font-medium"
                                                )}
                                            >
                                                {child.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return (
            <AccordionTrigger
                className={cn(
                    "hover:no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1.5 transition-colors",
                    isActive && "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                )}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        {item.icon && (
                            <item.icon className={cn(
                                "h-4 w-4 shrink-0",
                                isActive && "text-primary"
                            )} />
                        )}
                        <span className={cn(
                            "text-sm font-medium",
                            isActive && "text-primary font-semibold"
                        )}>
                            {item.title}
                        </span>
                    </div>
                    {item.badge && (
                        <Badge
                            variant={item.badge.variant || "secondary"}
                            className="h-5 px-1.5 text-xs"
                        >
                            {item.badge.text}
                        </Badge>
                    )}
                </div>
            </AccordionTrigger>
        );
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
                className="w-full space-y-1"
            >
                {items.map((item) =>
                    item.children && item.children.length > 0 ? (
                        <AccordionItem
                            value={item.title}
                            key={item.title}
                            className="border-none"
                        >
                            <AccordionTriggerEnhanced item={item}>
                                {item.title}
                            </AccordionTriggerEnhanced>

                            {/* Only show content when sidebar is open or on mobile */}
                            {(sidebarOpen || isMobile) && (
                                <AccordionContent className="pb-1">
                                    <SidebarMenu>
                                        {item.children.map((child) => {
                                            const isChildActive = child.href && isItemActive(child.href);

                                            return (
                                                <SidebarMenuItem key={child.title}>
                                                    <div className={cn(
                                                        "flex items-center",
                                                        "ml-4 pl-4 border-l border-sidebar-border/50"
                                                    )}>
                                                        <Dot className="h-3 w-3 text-muted-foreground mr-1" />
                                                        <MenuButton
                                                            item={child}
                                                            isChild={true}
                                                            isActive={!!isChildActive}
                                                        />
                                                    </div>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </AccordionContent>
                            )}
                        </AccordionItem>
                    ) : (
                        <SidebarMenu key={item.title}>
                            <SidebarMenuItem>
                                <MenuButton
                                    item={item}
                                    isActive={item.href && isItemActive(item.href) || false}
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    ),
                )}
            </Accordion>
        </SidebarGroup>
    );
}