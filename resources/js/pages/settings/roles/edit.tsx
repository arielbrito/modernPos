import * as React from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import RoleForm from "./partials/RoleForm";
import type { BreadcrumbItem, Permission, Role } from "@/types";
import RoleController from "@/actions/App/Http/Controllers/Settings/RoleController";

interface Props {
    role: Role;
    groupedPermissions: Record<string, Permission[]>;
    assignedPermissionIds: number[];
}

export default function EditRole({ role, groupedPermissions, assignedPermissionIds }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Roles", href: RoleController.index.url() },
        { title: `Editar: ${role.name}`, href: RoleController.edit.url({ role: role.id }) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Rol: ${role.name}`} />
            <div className="container mx-auto p-4 md:p-6">
                <RoleForm
                    role={role}
                    groupedPermissions={groupedPermissions}
                    assignedPermissionIds={assignedPermissionIds}
                />
            </div>
        </AppLayout>
    );
}