import * as React from "react";
import { useForm, Link } from "@inertiajs/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Role, Permission } from "@/types";
import RoleController from "@/actions/App/Http/Controllers/Settings/RoleController";

interface Props {
    role?: Role;
    groupedPermissions: Record<string, Permission[]>;
    assignedPermissionIds?: number[];
}

export default function RoleForm({ role, groupedPermissions, assignedPermissionIds = [] }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: role?.name || '',
        permissions: assignedPermissionIds,
    });

    const isEditing = !!role;

    const togglePermission = (permissionId: number) => {
        setData('permissions', data.permissions.includes(permissionId)
            ? data.permissions.filter(id => id !== permissionId)
            : [...data.permissions, permissionId]
        );
    };

    const toggleGroup = (permissionIds: number[], isGroupSelected: boolean) => {
        const newPermissions = isGroupSelected
            ? data.permissions.filter(id => !permissionIds.includes(id))
            : [...new Set([...data.permissions, ...permissionIds])];
        setData('permissions', newPermissions);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            put(RoleController.update.url({ role: role.id }));
        } else {
            post(RoleController.store.url());
        }
    };

    return (
        <form onSubmit={submit}>
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Rol</CardTitle>
                    <CardDescription>
                        Define el nombre del rol y los permisos que tendrá asociados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="name">Nombre del Rol</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            disabled={processing || data.name === 'Super-Admin'}
                            required
                        />
                        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <Label>Permisos</Label>
                        <div className="space-y-4 mt-2">
                            {Object.entries(groupedPermissions).map(([group, permissions]) => {
                                const groupPermissionIds = permissions.map(p => p.id);
                                const isGroupSelected = groupPermissionIds.every(id => data.permissions.includes(id));

                                return (
                                    <div key={group} className="p-4 border rounded-md">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">{group}</h3>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`select-all-${group}`} className="text-sm">Seleccionar todo</Label>
                                                <Checkbox
                                                    id={`select-all-${group}`}
                                                    checked={isGroupSelected}
                                                    onCheckedChange={() => toggleGroup(groupPermissionIds, isGroupSelected)}
                                                />
                                            </div>
                                        </div>
                                        <hr className="my-2" />
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {permissions.map(permission => (
                                                <div key={permission.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`permission-${permission.id}`}
                                                        checked={data.permissions.includes(permission.id)}
                                                        onCheckedChange={() => togglePermission(permission.id)}
                                                    />
                                                    <Label htmlFor={`permission-${permission.id}`} className="text-sm font-normal">
                                                        {permission.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.permissions && <p className="text-sm text-destructive mt-1">{errors.permissions}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                        <Link href={RoleController.index.url()}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? "Guardando..." : "Guardar Rol"}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}