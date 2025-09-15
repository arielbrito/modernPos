import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    CircleDollarSign,
    Folder,
    Landmark,
    LayoutGrid,
    Package,
    ScanBarcode,
    Settings,
    ShoppingBag,
    ShoppingCart,
    SquareStack,
    Store,
    Users,
    Users2,
    ComputerIcon,
    UserCheck,
    FileText,
    DollarSign
} from 'lucide-react';
import AppLogo from './app-logo';

// Importaciones de rutas organizadas
import products from '@/routes/inventory/products';
import categories from '@/routes/inventory/categories';
import purchases from '@/routes/inventory/purchases';
import suppliers from '@/routes/inventory/suppliers';
import pos from '@/routes/pos';
import stores from '@/routes/stores';
import users from '@/routes/users';
import customers from '@/routes/customers';
import ncf from '@/routes/fiscal/ncf';
import registers from '@/routes/cash/registers';
import cash from '@/routes/cash';
import sales from '@/routes/sales';

/**
 * Configuración de navegación principal
 * Organizada por módulos funcionales del sistema
 */
const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Punto de Venta',
        href: pos.index.url(),
        icon: ShoppingCart,
    },
    {
        title: 'Gestión de Caja',
        href: cash.cashbook.url(),
        icon: ComputerIcon, // Icono más específico para caja
    },
    {
        title: 'Clientes',
        href: customers.index.url(),
        icon: UserCheck, // Icono más específico para clientes
    },
    {
        title: 'Ventas',
        icon: FileText,
        children: [
            {
                title: 'Listado de ventas',
                href: sales.index.url(),
                icon: DollarSign,
            },
            // {
            //     title: 'Productos',
            //     href: products.index.url(),
            //     icon: ScanBarcode,
            // },
            // {
            //     title: 'Proveedores',
            //     href: suppliers.index.url(),
            //     icon: Users,
            // },
            // {
            //     title: 'Compras',
            //     href: purchases.index.url(),
            //     icon: ShoppingBag,
            // },
        ]
    },
    {
        title: 'Inventario',
        icon: Package,
        children: [
            {
                title: 'Categorías',
                href: categories.index.url(),
                icon: SquareStack,
            },
            {
                title: 'Productos',
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
                href: purchases.index.url(),
                icon: ShoppingBag,
            },
        ]
    },
    {
        title: 'Configuración',
        icon: Settings,
        children: [
            {
                title: 'Tiendas',
                href: stores.index.url(),
                icon: Store,
            },
            {
                title: 'Usuarios del Sistema',
                href: users.index.url(),
                icon: Users2,
            },
            {
                title: 'Secuencias NCF',
                href: ncf.index.url(),
                icon: Landmark,
            },
            {
                title: 'Cajas Registradoras',
                href: registers.index.url(),
                icon: CircleDollarSign,
            },
        ]
    },
];

/**
 * Enlaces del pie de página con recursos externos
 */
const footerNavItems: NavItem[] = [
    {
        title: 'Repositorio',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentación',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

/**
 * Componente principal de la barra lateral
 * Proporciona navegación jerárquica para el sistema POS
 */
export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-sidebar-border"
        >
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-sidebar-accent transition-colors duration-200"
                        >
                            <Link
                                href={dashboard()}
                                prefetch
                                className="flex items-center gap-2 font-semibold"
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4">
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
                <NavFooter
                    items={footerNavItems}
                    className="mb-4"
                />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}