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
    badge?: {
        text: string | number;
        variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    };
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
export interface Role {
    id: number;
    name: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    role_id: number;
    role: Role;
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
    stock: number;
    id: number;
    product_id: number; // Es bueno tenerla para referencias
    sku: string;
    barcode?: string | null;
    attributes?: Record<string, any> | null;

    // Cambiado a 'number' para cálculos más seguros en el frontend
    cost_price: number;
    selling_price: number;

    // Campos de impuestos añadidos
    is_taxable: boolean;
    tax_code: string | null;
    tax_rate: number | null;

    // Campos de imagen
    image_path: string | null;
    image_url: string | null; // El accesor puede devolver null si no hay imagen
}

// Define la estructura del Producto principal
// Define la estructura del Producto principal
export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string | null;

    // Se mantiene, está correcto
    product_nature: 'stockable' | 'service';

    category_id: number | null;
    supplier_id: number | null;
    type: 'simple' | 'variable';
    unit: string;
    is_active: boolean;
    total_stock: string;

    // Cambiado de 'any' a 'string' para mayor seguridad de tipos
    created_at: string;
    updated_at: string;

    // Relaciones (se mantienen)
    category?: Category | null;
    supplier?: Supplier | null;
    variants: ProductVariant[];
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    links: PaginationLink[]; // <-- LA CORRECCIÓN CLAVE: debe ser un array de PaginationLink

    // El resto de las propiedades que Laravel envía para la paginación
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}
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
    created_at: string | undefined;
    updated_at: string;
    id: number;
    name: string;
    code?: string | null;
    rnc: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currency: string;
    logo?: File | null;
    logo_url?: string | null;
    is_active: boolean;
}

export interface CartItem {
    length?: number;
    product_variant_id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Register {
    id: number;
    name: string;
}
export interface Shift {
    id: string;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at?: string | null;
    opened_by?: { id: number; name: string } | null;
    currency_code: string;
}

export interface ShiftSummary {
    opening: number;
    income: number;
    expense: number;
    cash_in_hand: number;
    expense_visible: number;
    closing: number;
}

export interface Movement {
    id: number;
    created_at: string;
    direction: 'in' | 'out';
    amount: number;
    reason?: string | null;
    reference?: string | null;
    user?: { id: number; name: string } | null;
    pay_method?: string | null;
    pay_currency?: string | null;
    sale_number?: string | null;
}

export interface PaymentsAggRow {
    method: string;
    currency_code: string;
    count: number;
    amount: number;
    amount_in_sale_ccy: number;
}

export interface Denomination {
    id: number;
    value: number;
    kind: 'bill' | 'coin';
    currency_code: string;
}
