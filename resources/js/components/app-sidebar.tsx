import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Package, ScanBarcode, ShoppingBag, ShoppingCart, SquareStack, Users } from 'lucide-react';
import AppLogo from './app-logo';
import products from '@/routes/inventory/products';
import categories from '@/routes/inventory/categories';
import pos from '@/routes/pos';
import purchases from '@/routes/inventory/purchases';
import suppliers from '@/routes/inventory/suppliers';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'POS',
        href: pos.index.url(),
        icon: ShoppingCart,
    },

    {
        title: 'Inventory',
        icon: Package,
        children: [
            {
                title: 'Categoria',
                href: categories.index.url(),
                icon: SquareStack,
            },
            {
                title: 'Producto',
                href: products.index.url(),
                icon: ScanBarcode,
            },
            {
                title: 'Proveedores',
                href: suppliers.index.url(),
                icon: Users,
            },
            {
                title: 'Compras',
                href: purchases.create.url(),
                icon: ShoppingBag,
            },

        ]
    },

];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
