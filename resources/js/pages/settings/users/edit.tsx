/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { User, Role, Store } from '@/types';
import UserForm from './partials/user-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    ArrowLeft,
    PencilLine,
    Users,
    User as UserIcon,
    Mail,
    CalendarDays,
    Shield,
    Building2,
    Crown,
    CheckCircle2,
    AlertCircle,
    Clock
} from 'lucide-react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';

interface Props {
    user: User & {
        roles?: Array<Pick<Role, 'id' | 'name'>>;
        stores?: Array<Pick<Store, 'id' | 'name'>>;
    };
    roles: Role[];
    stores: Store[];
}

export default function Edit({ user, roles, stores }: Props) {
    const verified = Boolean(user.email_verified_at);
    const createdAt = user.created_at ? new Date(user.created_at as any) : null;

    const daysSinceCreated = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const initials = (user.name || "")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Usuarios", href: UserController.index.url() },
                { title: user.name, href: UserController.show.url({ user: user.id }) },
                { title: "Editar", href: UserController.edit.url({ user: user.id }) },
            ]}
        >
            <Head title={`Editando: ${user.name}`} />

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header Premium con información del usuario */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-6">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar del usuario */}
                            <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Editando: {user.name}
                                    </h1>
                                    {verified ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Verificado
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Pendiente
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        <span>Miembro desde hace {daysSinceCreated} días</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" />
                                        <span>ID: {user.id}</span>
                                    </div>
                                </div>

                                <p className="text-gray-600 max-w-md">
                                    Actualiza la información, permisos y accesos de este usuario
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button variant="outline" asChild className="w-full sm:w-auto">
                                <Link href={UserController.show.url({ user: user.id })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Ver Perfil
                                </Link>
                            </Button>

                            <Button variant="ghost" asChild className="w-full sm:w-auto">
                                <Link href={UserController.index.url()}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Todos los Usuarios
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Elementos decorativos */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-orange-200/30 blur-xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-yellow-200/20 blur-2xl" />
                </div>

                {/* Cards de información actual */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4 text-center">
                            <UserIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-sm font-medium text-blue-900">
                                Estado Actual
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                                {verified ? 'Verificado' : 'Sin Verificar'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-4 text-center">
                            <Crown className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-amber-900">
                                {user.roles?.length || 0}
                            </div>
                            <div className="text-xs text-amber-600">
                                Roles Asignados
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="p-4 text-center">
                            <Building2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-900">
                                {user.stores?.length || 0}
                            </div>
                            <div className="text-xs text-green-600">
                                Tiendas Asignadas
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4 text-center">
                            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <div className="text-sm font-medium text-purple-900">
                                Última Act.
                            </div>
                            <div className="text-xs text-purple-600 mt-1">
                                {user.updated_at
                                    ? new Date(user.updated_at as any).toLocaleDateString('es-ES', {
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : 'No disponible'
                                }
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Información actual del usuario */}
                {(user.roles?.length || user.stores?.length) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Roles actuales */}
                        {user.roles && user.roles.length > 0 && (
                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="h-5 w-5 text-amber-600" />
                                        <h3 className="font-semibold">Roles Actuales</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {user.roles.map((role) => (
                                            <div
                                                key={role.id ?? role.name}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200"
                                            >
                                                <Crown className="h-4 w-4 text-amber-600" />
                                                <span className="text-amber-800 font-medium">{role.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tiendas actuales */}
                        {user.stores && user.stores.length > 0 && (
                            <Card className="shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 className="h-5 w-5 text-green-600" />
                                        <h3 className="font-semibold">Tiendas Actuales</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {user.stores.map((store) => (
                                            <div
                                                key={store.id}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200"
                                            >
                                                <Building2 className="h-4 w-4 text-green-600" />
                                                <span className="text-green-800 font-medium">{store.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Alerta informativa */}
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-1 rounded-full bg-orange-100">
                                <PencilLine className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-orange-900">
                                    Editando Usuario Existente
                                </h4>
                                <p className="text-sm text-orange-700">
                                    Los cambios realizados se aplicarán inmediatamente. Si no deseas cambiar la contraseña, déjala en blanco.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Formulario */}
                <div className="max-w-4xl mx-auto">
                    <UserForm user={user} roles={roles} stores={stores} />
                </div>
            </div>
        </AppLayout>
    );
}