import * as React from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import RoleForm from "./partials/RoleForm";
import type { BreadcrumbItem, Permission } from "@/types";
import RoleController from "@/actions/App/Http/Controllers/Settings/RoleController";

interface Props {
    groupedPermissions: Record<string, Permission[]>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Roles", href: RoleController.index.url() },
    { title: "Crear", href: RoleController.create.url() },
];

export default function CreateRole({ groupedPermissions }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Nuevo Rol" />
            <div className="container mx-auto p-4 md:p-6">
                <RoleForm groupedPermissions={groupedPermissions} />
            </div>
        </AppLayout>
    );
}