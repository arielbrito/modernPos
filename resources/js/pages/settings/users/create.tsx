import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Role, Store } from '@/types';
import UserForm from './partials/user-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';

interface Props {
    roles: Role[];
    stores: Store[];
}

export default function Create({ roles, stores }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: "Usuarios", href: UserController.index.url() },
                { title: "Nuevo Usuario", href: UserController.create.url() },
            ]}
        >
            <Head title="Crear Nuevo Usuario" />

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header Premium */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-100 shadow-sm">
                                <UserPlus className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Usuario</h1>
                                <p className="text-gray-600 mt-1">
                                    Agrega un nuevo miembro al equipo con roles y permisos específicos
                                </p>
                            </div>
                        </div>

                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link href={UserController.index.url()}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al listado
                            </Link>
                        </Button>
                    </div>

                    {/* Elementos decorativos */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-200/30 blur-xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-purple-200/20 blur-2xl" />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4 text-center">
                            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-900">
                                {roles.length}
                            </div>
                            <div className="text-sm text-blue-600">
                                Roles Disponibles
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="p-4 text-center">
                            <UserPlus className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-900">
                                {stores.length}
                            </div>
                            <div className="text-sm text-green-600">
                                Tiendas Disponibles
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4 text-center">
                            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-purple-600 font-bold text-sm">?</span>
                            </div>
                            <div className="text-2xl font-bold text-purple-900">
                                Nuevo
                            </div>
                            <div className="text-sm text-purple-600">
                                Usuario a Crear
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Formulario */}
                <div className="max-w-4xl mx-auto">
                    <UserForm roles={roles} stores={stores} />
                </div>
            </div>
        </AppLayout>
    );
}