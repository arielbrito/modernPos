import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useDebouncedCallback } from "use-debounce";

// --- LAYOUT & COMPONENTS ---
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/pagination"; // Asumiendo que tienes un componente de paginación reutilizable

// --- ICONS ---
import { Plus, Users2, Search, Filter, X, MailCheck, MailX, MoreVertical, Eye, Pencil } from 'lucide-react';

// --- UTILS, TYPES & ACTIONS ---
import type { BreadcrumbItem, Paginated, User, Role, Store } from '@/types';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import { fmtDate } from "@/utils/date";

// --- TYPES ---
interface Props {
    users: Paginated<User>;
    roles: Role[];
    stores: Store[];
    filters: {
        q?: string;
        role_id?: string;
        store_id?: string;
        verified?: string;
    };
}

// --- SUB-COMPONENTES ---
const VerificationBadge = ({ isVerified }: { isVerified: boolean }) => (
    isVerified ?
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><MailCheck className="h-3 w-3 mr-1" />Verificado</Badge> :
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200"><MailX className="h-3 w-3 mr-1" />Pendiente</Badge>
);

const UserRow = ({ user }: { user: User }) => (
    <TableRow>
        <TableCell>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
        </TableCell>
        <TableCell><VerificationBadge isVerified={!!user.email_verified_at} /></TableCell>
        <TableCell><div className="flex flex-wrap gap-1">{user.roles?.map(r => <Badge key={r.id} variant="secondary">{r.name}</Badge>)}</div></TableCell>
        <TableCell><div className="flex flex-wrap gap-1">{user.stores?.map(s => <Badge key={s.id} variant="outline">{s.name}</Badge>)}</div></TableCell>
        <TableCell className="text-right">
            <Button asChild variant="ghost" size="icon">
                <Link href={UserController.show.url({ user: user.id })}><Eye className="h-4 w-4" /></Link>
            </Button>
        </TableCell>
        <TableCell className="text-right">
            <Button asChild variant="ghost" size="icon">
                <Link href={UserController.edit.url({ user: user.id })}><Pencil className="h-4 w-4" /></Link>
            </Button>
        </TableCell>
    </TableRow>
);

const breadcrumbs: BreadcrumbItem[] = [{ title: "Usuarios", href: UserController.index.url() }];

// --- COMPONENTE PRINCIPAL ---
export default function UsersIndex({ users, roles, stores, filters: initialFilters }: Props) {
    const [filters, setFilters] = React.useState({
        q: initialFilters.q || '',
        role_id: initialFilters.role_id || 'all',
        store_id: initialFilters.store_id || 'all',
        verified: initialFilters.verified || 'all',
    });
    const [isLoading, setIsLoading] = React.useState(false);

    const debouncedSubmit = useDebouncedCallback((newFilters) => {
        setIsLoading(true);
        router.get(UserController.index.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['users', 'filters'],
            onFinish: () => setIsLoading(false),
        });
    }, 300);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        debouncedSubmit(newFilters);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Usuarios" />
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users2 className="h-6 w-6" /></div>
                        <div>
                            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                            <p className="text-muted-foreground">Administra los miembros de tu equipo y sus permisos.</p>
                        </div>
                    </div>
                    <Button asChild><Link href={UserController.create.url()}><Plus className="mr-2 h-4 w-4" /> Nuevo Usuario</Link></Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar por nombre o email..." value={filters.q} onChange={e => handleFilterChange('q', e.target.value)} className="pl-8" />
                            </div>
                            <Select value={filters.role_id} onValueChange={v => handleFilterChange('role_id', v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Todos los roles</SelectItem>{roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.store_id} onValueChange={v => handleFilterChange('store_id', v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Todas las tiendas</SelectItem>{stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-64 w-full" /> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Tiendas</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length > 0 ? (
                                        users.data.map(user => <UserRow key={user.id} user={user} />)
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron usuarios.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                        <Pagination links={users.links} className="mt-4" />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}