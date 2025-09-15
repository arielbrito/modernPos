import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, PencilLine, MailCheck, MailX, Eye, Users2, Search, Filter } from 'lucide-react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import UserFilter, { type UserFilters } from './partials/user-filter';
import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

type PaginationLink = { url: string | null; label: string; active: boolean };
type Pagination<T> = { data: T[]; links: PaginationLink[] };

type RoleOption = { id: number; name: string };
type StoreOption = { id: number; name: string };

type Props = {
    users: Pagination<User>;
    roles: RoleOption[];
    stores: StoreOption[];
    filters: Partial<UserFilters>;
};

const DEFAULTS: UserFilters = {
    q: '',
    role_id: 'all',
    store_id: 'all',
    verified: 'all',
    sort: 'created_at',
    dir: 'desc',
    per_page: 10,
};

// Componente Loading Skeleton mejorado
const UsersTableSkeleton = () => (
    <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-8 w-16" />
            </div>
        ))}
    </div>
);

// Componente de paginación mejorado
const PaginationImproved = ({ links }: { links: PaginationLink[] }) => {
    if (!links || links.length <= 3) return null;

    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Info de resultados */}
            <div className="text-sm text-muted-foreground">
                Mostrando resultados de la búsqueda
            </div>

            {/* Navegación */}
            <nav className="flex items-center gap-1" aria-label="Paginación">
                {links.map((link, i) => {
                    const isEllipsis = link.label.includes('...');
                    const isPrevNext = link.label.includes('Previous') || link.label.includes('Next');

                    return (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            preserveScroll
                            preserveState
                            className={[
                                'flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-all duration-200',
                                link.active
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-105'
                                    : 'hover:bg-muted hover:border-muted-foreground/20 hover:shadow-sm',
                                !link.url
                                    ? 'cursor-not-allowed opacity-50 text-muted-foreground hover:bg-transparent hover:border-border hover:shadow-none'
                                    : 'hover:scale-105',
                                isEllipsis ? 'cursor-default hover:bg-transparent hover:scale-100 border-transparent' : '',
                                isPrevNext ? 'font-normal' : ''
                            ].join(' ')}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                            aria-current={link.active ? 'page' : undefined}
                        />
                    );
                })}
            </nav>
        </div>
    );
};

// Componente de estado vacío mejorado
const EmptyState = ({ hasFilters }: { hasFilters: boolean }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
            {hasFilters ? 'No se encontraron usuarios' : 'Aún no hay usuarios'}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
            {hasFilters
                ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que buscas.'
                : 'Comienza agregando tu primer usuario al sistema para gestionar el acceso y permisos.'
            }
        </p>
        {!hasFilters && (
            <Button asChild className="gap-2">
                <Link href={UserController.create.url()}>
                    <Plus className="h-4 w-4" /> Crear Primer Usuario
                </Link>
            </Button>
        )}
    </div>
);

// Componente de badge de verificación mejorado
const VerificationBadge = ({ isVerified }: { isVerified: boolean }) => (
    isVerified ? (
        <Badge variant="default" className="gap-1.5 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            <MailCheck className="h-3 w-3" />
            Verificado
        </Badge>
    ) : (
        <Badge variant="secondary" className="gap-1.5 bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            <MailX className="h-3 w-3" />
            Pendiente
        </Badge>
    )
);

export default function UsersIndex({ users, roles, stores, filters }: Props) {
    const [f, setF] = React.useState<UserFilters>({ ...DEFAULTS, ...filters });
    const [isLoading, setIsLoading] = React.useState(false);

    // Detectar si hay filtros activos
    const hasActiveFilters = React.useMemo(() => {
        return f.q !== DEFAULTS.q ||
            f.role_id !== DEFAULTS.role_id ||
            f.store_id !== DEFAULTS.store_id ||
            f.verified !== DEFAULTS.verified;
    }, [f]);

    // Manejo de loading state
    React.useEffect(() => {
        setIsLoading(true);
        const timeoutId = setTimeout(() => {
            router.get(UserController.index.url(), {
                q: f.q || undefined,
                role_id: f.role_id !== 'all' ? f.role_id : undefined,
                store_id: f.store_id !== 'all' ? f.store_id : undefined,
                verified: f.verified !== 'all' ? f.verified : undefined,
                sort: f.sort,
                dir: f.dir,
                per_page: f.per_page,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['users', 'filters'],
                onFinish: () => setIsLoading(false),
            });
        }, 300); // Debounce de 300ms

        return () => clearTimeout(timeoutId);
    }, [f]);

    return (
        <AppLayout>
            <Head title="Gestión de Usuarios" />

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header mejorado */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Users2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
                            <p className="text-muted-foreground">
                                Administra usuarios, roles y permisos del sistema
                            </p>
                        </div>
                    </div>

                    <Button asChild size="default" className="gap-2 shadow-sm">
                        <Link href={UserController.create.url()}>
                            <Plus className="h-4 w-4" />
                            Nuevo Usuario
                        </Link>
                    </Button>
                </div>

                {/* Card principal */}
                <Card className="shadow-sm">
                    <CardHeader className="space-y-4 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                    Usuarios Registrados
                                </CardTitle>
                                <Badge variant="secondary" className="font-normal">
                                    {users.data.length} de {users.data.length} usuarios
                                </Badge>
                                {hasActiveFilters && (
                                    <Badge variant="outline" className="gap-1">
                                        <Filter className="h-3 w-3" />
                                        Filtrado
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <UserFilter
                            value={f}
                            onChange={setF}
                            roles={roles}
                            stores={stores}
                            defaults={DEFAULTS}
                        />
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-6">
                                <UsersTableSkeleton />
                            </div>
                        ) : users.data.length === 0 ? (
                            <EmptyState hasFilters={hasActiveFilters} />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-semibold">Usuario</TableHead>
                                            <TableHead className="font-semibold">Contacto</TableHead>
                                            <TableHead className="font-semibold">Estado</TableHead>
                                            <TableHead className="font-semibold">Roles</TableHead>
                                            <TableHead className="font-semibold">Tiendas</TableHead>
                                            <TableHead className="text-right font-semibold">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.data.map(u => (
                                            <TableRow
                                                key={u.id}
                                                className="hover:bg-muted/30 transition-colors duration-200"
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <Users2 className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-sm">{u.name}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {u.id}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-sm truncate max-w-[200px]" title={u.email}>
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <VerificationBadge isVerified={!!u.email_verified_at} />
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {(u.roles ?? []).length ? (
                                                            u.roles!.map(r => (
                                                                <Badge
                                                                    key={r.id ?? r.name}
                                                                    variant="outline"
                                                                    className="text-xs font-normal"
                                                                >
                                                                    {r.name}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                Sin asignar
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                        {(u.stores ?? []).length ? (
                                                            u.stores.map(s => (
                                                                <Badge
                                                                    key={s.id}
                                                                    variant="secondary"
                                                                    className="text-xs font-normal"
                                                                >
                                                                    {s.name}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                Sin asignar
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <TooltipProvider delayDuration={300}>
                                                        <div className="flex justify-end gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link href={UserController.show.url({ user: Number(u.id) })}>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 hover:bg-muted transition-all duration-200 hover:scale-105"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    Ver Detalles
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link href={UserController.edit.url({ user: Number(u.id) })}>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 hover:bg-muted transition-all duration-200 hover:scale-105"
                                                                        >
                                                                            <PencilLine className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    Editar Usuario
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {!isLoading && users.data.length > 0 && (
                            <div className="px-6 pb-4">
                                <PaginationImproved links={users.links} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}