import * as React from "react";
import { Head, Link, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { Plus, Shield } from "lucide-react";
import type { BreadcrumbItem, Paginated, Role } from "@/types";


// Partials
import { RoleRow } from "./partials/RoleRow";
import { TableSkeleton } from "./partials/TableSkeleton";
import { EmptyState } from "./partials/EmptyState";
import RoleController from "@/actions/App/Http/Controllers/Settings/RoleController";

interface Props {
    roles: Paginated<Role>;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Roles y Permisos", href: RoleController.index.url() }];

export default function RolesIndex({ roles }: Props) {
    const [isLoading, setIsLoading] = React.useState(false);

    // Pequeño efecto para simular carga al paginar
    React.useEffect(() => {
        const handleStart = () => setIsLoading(true);
        const handleFinish = () => setIsLoading(false);

        const removeStartListener = router.on('start', () => setIsLoading(true));
        const removeFinishListener = router.on('finish', () => setIsLoading(false));

        return () => {
            removeStartListener();
            removeFinishListener();
        };
    }, []);

    const hasRoles = roles.data.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles y Permisos" />
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Roles y Permisos</h1>
                            <p className="text-sm text-muted-foreground">Define qué pueden hacer tus usuarios en el sistema.</p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={RoleController.create.url()}><Plus className="mr-2 h-4 w-4" /> Crear Rol</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Roles del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Rol</TableHead>
                                    <TableHead>Permisos Asignados</TableHead>
                                    <TableHead>Usuarios con el Rol</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <TableSkeleton /> : (
                                    hasRoles ?
                                        roles.data.map(role => <RoleRow key={role.id} role={role} />) :
                                        <TableRow><TableCell colSpan={4}><EmptyState /></TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {hasRoles && !isLoading && (
                            <div className="p-4 border-t">
                                <Pagination links={roles.links} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}