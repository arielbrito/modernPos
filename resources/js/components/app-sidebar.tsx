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
    DollarSign,
    PackageOpen,
    Archive,
    ArrowLeftRight
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
import cash, { cashbook } from '@/routes/cash';
import sales from '@/routes/sales';
import admin from '@/routes/admin';
import adjustments from '@/routes/inventory/adjustments';
import returns from '@/routes/sales/returns';
import purchaseReturns from '@/routes/purchaseReturns';
import roles from '@/routes/roles';

/**
 * Configuración de navegación principal
 * Organizada por módulos funcionales del sistema
 */
const mainNavItems: NavItem[] = [
    // --- 1. OPERACIONES ---
    {
        title: 'Operaciones',
        isSection: true, // Prop opcional para renderizar como título de sección
    },
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
        title: 'Caja Diaria',
        href: cashbook.url(),
        icon: ComputerIcon,
    },

    // --- 2. GESTIÓN ---
    {
        title: 'Gestión',
        isSection: true,
    },
    {
        title: 'Ventas',
        icon: FileText,
        permission: 'sales.view', // Ejemplo de permisos, ajustar según necesidades
        children: [
            { title: 'Listado de Ventas', href: sales.index.url(), icon: DollarSign },
            // { title: 'Devoluciones de Venta', href: returns.index.url(), icon: ArrowLeftRight },
        ],
    },
    {
        title: 'Inventario',
        icon: Archive, // Icono más genérico para el módulo
        children: [
            { title: 'Productos', href: products.index.url(), icon: ScanBarcode, permission: 'products.view' },
            { title: 'Compras', href: purchases.index.url(), icon: ShoppingBag, permission: 'purchases.view' },
            { title: 'Devoluciones (Compra)', href: purchaseReturns.index.url(), icon: ArrowLeftRight, permission: 'purchaseReturns.view' },
            { title: 'Ajustes', href: adjustments.index.url(), icon: Package, permission: 'inventory_adjustments.view' },
        ],
    },
    {
        title: 'Catálogos',
        icon: BookOpen,
        children: [
            { title: 'Clientes', href: customers.index.url(), icon: UserCheck, permission: 'customers.view' },
            { title: 'Proveedores', href: suppliers.index.url(), icon: Users, permission: 'suppliers.view' },
            { title: 'Categorías', href: categories.index.url(), icon: SquareStack, permission: 'categories.view' },
        ],
    },
    // {
    //     title: 'Reportes',
    //     href: '#', // Futuro
    //     icon: Activity,
    // },

    // --- 3. CONFIGURACIÓN ---
    {
        title: 'Configuración',
        isSection: true,
    },
    {
        title: 'Sistema',
        icon: Settings,
        permission: 'settings.view', // Solo usuarios con permiso de administración
        children: [
            { title: 'Tiendas', href: stores.index.url(), icon: Store, permission: 'stores.view' },
            { title: 'Gestión de Cajas', href: registers.index.url(), icon: CircleDollarSign, permission: 'registers.view' },
            { title: 'Usuarios del Sistema', href: users.index.url(), icon: Users2, permission: 'users.view' },
            { title: 'Roles', href: roles.index.url(), icon: Users2 },
        ],
    },
    {
        title: 'Fiscal',
        icon: Landmark,
        children: [
            { title: 'Secuencias NCF', href: ncf.index.url(), icon: FileText, permission: 'ncf.view' },
            { title: 'Sincronización DGII', href: admin.dgiiSync.create.url(), permission: 'dgii.sync.view' },
        ],
    },
];


/**
 * Enlaces del pie de página con recursos externos
 */
// const footerNavItems: NavItem[] = [
//     {
//         title: 'Repositorio',
//         href: 'https://github.com/laravel/react-starter-kit',
//         icon: Folder,
//     },
//     {
//         title: 'Documentación',
//         href: 'https://laravel.com/docs/starter-kits#react',
//         icon: BookOpen,
//     },
// ];

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
                {/* <NavFooter
                    items={footerNavItems}
                    className="mb-4"
                /> */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}