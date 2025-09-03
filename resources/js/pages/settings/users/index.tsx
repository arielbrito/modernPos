import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, PencilLine, MailCheck, MailX, Eye, UsersRoundIcon } from 'lucide-react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import UserFilter, { type UserFilters } from './partials/user-filter';
import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const Pagination = ({ links }: { links: PaginationLink[] }) => {
    if (!links || links.length <= 3) return null;
    return (
        <div className="mt-6 flex items-center justify-center gap-1">
            {links.map((l, i) => (
                <Link key={i} href={l.url ?? '#'} preserveScroll preserveState
                    className={[
                        'flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors',
                        l.active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                        !l.url ? 'cursor-not-allowed opacity-50 text-muted-foreground hover:bg-transparent' : '',
                    ].join(' ')}
                    dangerouslySetInnerHTML={{ __html: l.label }}
                />
            ))}
        </div>
    );
};

export default function UsersIndex({ users, roles, stores, filters }: Props) {
    // estado de filtros controlado por el parent (Index)
    const [f, setF] = React.useState<UserFilters>({ ...DEFAULTS, ...filters });


    // cuando cambie cualquier filtro, llamamos al backend
    React.useEffect(() => {
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
        });
    }, [f]);

    return (
        <AppLayout>
            <Head title="Usuarios" />
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6 flex items-center gap-3">
                    <UsersRoundIcon className="h-6 w-6 text-muted-foreground" />
                    <h1 className="text-2xl font-semibold">Gestión de Usuarios </h1>
                </div>
                <Card>
                    <CardHeader className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>Listado de Usuarios</CardTitle>
                            <Button asChild className="gap-2">
                                <Link href={UserController.create.url()}>
                                    <Plus className="h-4 w-4" /> Nuevo Usuario
                                </Link>
                            </Button>
                        </div>

                        {/* aquí usamos el componente */}
                        <UserFilter
                            value={f}
                            onChange={setF}
                            roles={roles}
                            stores={stores}
                            defaults={DEFAULTS}
                        />
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead>Tiendas</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.map(u => (
                                        <TableRow key={u.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="font-medium">{u.name}</div>
                                                <div className="text-xs text-muted-foreground">ID: {u.id}</div>
                                            </TableCell>
                                            <TableCell><div className="truncate max-w-[280px]">{u.email}</div></TableCell>
                                            <TableCell>
                                                {u.email_verified_at ? (
                                                    <Badge variant="outline" className="gap-1"><MailCheck className="h-3.5 w-3.5" /> Verificado</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1"><MailX className="h-3.5 w-3.5" /> Sin verificar</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(u.roles ?? []).length
                                                        ? u.roles!.map(r => <Badge key={r.id ?? r.name}>{r.name}</Badge>)
                                                        : <span className="text-sm text-muted-foreground">Sin rol</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(u.stores ?? []).map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <TooltipProvider delayDuration={100}>
                                                    <div className="flex justify-end gap-2">
                                                        <Tooltip><TooltipTrigger asChild><Link href={(UserController.show.url({ user: Number(u.id) }))}><Button size="icon" variant="outline"><Eye className="h-4 w-4" /></Button></Link></TooltipTrigger><TooltipContent>Ver Detalles</TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Link href={(UserController.edit.url({ user: Number(u.id) }))}><Button size="icon" variant="outline"><PencilLine className="h-4 w-4" /></Button></Link></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>

                                                    </div>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {users.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No se encontraron usuarios.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination links={users.links} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
