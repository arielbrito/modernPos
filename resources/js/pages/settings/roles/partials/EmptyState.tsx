import * as React from "react";
import { Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { ShieldPlus, ShieldQuestion } from "lucide-react";
import { create } from "@/actions/App/Http/Controllers/Settings/RoleController";

export const EmptyState = () => (
    <div className="text-center py-12">
        <ShieldQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No se encontraron roles</h3>
        <p className="mt-2 text-sm text-muted-foreground">
            Comienza creando tu primer rol para empezar a gestionar permisos.
        </p>
        <Button asChild className="mt-6 gap-2">
            <Link href={create()}>
                <ShieldPlus className="h-4 w-4" /> Crear Primer Rol
            </Link>
        </Button>
    </div>
);