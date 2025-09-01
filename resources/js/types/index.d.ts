/* eslint-disable @typescript-eslint/no-explicit-any */
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    children?: NavItem[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    flash?: {
        // Añadir propiedades conocidas
        success?: string;
        error?: string;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

//Definir la estructura de categorias
export interface Category {
    parent: any;
    id: number;
    name: string;
    slug: string | null;
    description: string | null;
    parent_id: number | null;
}

// Define la estructura de una Variante de Producto
export interface ProductVariant {
    [x: string]: any;
    image_url: string;
    id: number;
    sku: string;
    barcode?: string | null;
    attributes?: Record<string, any> | null; // Para el JSON de atributos
    cost_price: string; // Laravel lo envía como string
    selling_price: string; // Laravel lo envía como string
    image_path: string | null;
}

// Define la estructura del Producto principal
// Define la estructura del Producto principal
export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string | null;

    // IDs deben ser numéricos
    category_id: number | null;
    supplier_id: number | null;

    type: 'simple' | 'variable';

    // Relaciones eager-loaded (opcionales)
    category?: Category | null;
    supplier?: Supplier | null;

    // El producto tiene variantes, esto está correcto
    variants: ProductVariant[];
}

export type PaginatedResponse<T> = {
    data: T[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
};

export interface Supplier {
    id: number;
    name: string;
    contact_person?: string | null; // Corregido
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    rnc?: string | null;
    is_active: boolean;
}

export interface Store {
    id: number;
    name: string;
    rnc: string;
    phone?: string | null;
    address?: string | null;
    currency: string;
    logo?: string | null;
    is_active: boolean;
}

export interface CartItem {
    product_variant_id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
}
