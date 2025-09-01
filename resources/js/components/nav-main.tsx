import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();

    const isGroupActive = (children: NavItem[] = []) => {
        // Check that a child has an href before checking the URL
        return children.some(
            (child) =>
                child.href &&
                page.url.startsWith(typeof child.href === 'string' ? child.href : child.href.url),
        );
    };

    const defaultOpenItems = items
        .filter((item) => isGroupActive(item.children))
        .map((item) => item.title);

    return (
        <SidebarGroup className="px-2 py-0">
            <Accordion type="multiple" defaultValue={defaultOpenItems} className="w-full">
                {items.map((item) =>
                    item.children ? (
                        <AccordionItem value={item.title} key={item.title} className="border-none">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-4">
                                <SidebarMenu key={item.title}>
                                    {item.children.map((child) => (
                                        <SidebarMenuItem key={child.title}>
                                            <SidebarMenuButton
                                                asChild
                                                // Add a check here as well
                                                isActive={
                                                    !!child.href &&
                                                    page.url.startsWith(
                                                        typeof child.href === 'string'
                                                            ? child.href
                                                            : child.href.url,
                                                    )
                                                }
                                                tooltip={{ children: child.title }}
                                            >
                                                {/* Provide a fallback href */}
                                                <Link href={child.href ?? '#'} prefetch>
                                                    {child.icon && <child.icon />}
                                                    <span>{child.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </AccordionContent>
                        </AccordionItem>
                    ) : (
                        <SidebarMenu key={item.title}>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    // Add a check here
                                    isActive={
                                        !!item.href &&
                                        page.url.startsWith(
                                            typeof item.href === 'string' ? item.href : item.href.url,
                                        )
                                    }
                                    tooltip={{ children: item.title }}
                                >
                                    {/* Provide a fallback href */}
                                    <Link href={item.href ?? '#'} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    ),
                )}
            </Accordion>
        </SidebarGroup>
    );
}