import * as React from "react";
import { Link, router } from "@inertiajs/react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, ShieldCheck } from "lucide-react";
import type { Role } from "@/types";
import { edit } from "@/actions/App/Http/Controllers/Settings/RoleController";


interface Props {
    role: Role;
}

export const RoleRow = ({ role }: Props) => {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{role.name}</span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="secondary">{role.permissions_count} Permisos</Badge>
            </TableCell>
            <TableCell>
                <Badge variant="outline">{role.users_count} Usuarios</Badge>
            </TableCell>
            <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon" disabled={role.name === 'Super-Admin'}>
                    <Link href={edit(role.id)}>
                        <Pencil className="h-4 w-4" />
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
};