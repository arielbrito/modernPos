/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, useForm } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ArrowLeft,
    MailCheck,
    MailX,
    PencilLine,
    Trash2,
    User as UserIcon,
    Shield,
    Store as StoreIcon,
    CalendarDays,
} from "lucide-react";
import UserController from "@/actions/App/Http/Controllers/Settings/UserController";

// Si tienes estos tipos en "@/types", úsalos:
import type { User, Role, Store } from "@/types";

// Pequeño helper visual para filas de detalle
const FieldRow = ({
    label,
    value,
    icon,
}: {
    label: string;
    value?: React.ReactNode;
    icon?: React.ReactNode;
}) => (
    <div className="flex items-start gap-3 py-2">
        {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
        <div className="min-w-28 text-sm text-muted-foreground">{label}</div>
        <div className="flex-1 font-medium">{value ?? "—"}</div>
    </div>
);

type UserWithRels = User & {
    roles?: Array<Pick<Role, "id" | "name">>;
    stores?: Array<Pick<Store, "id" | "name">>;
};

interface Props {
    user: UserWithRels;
}

export default function UserShow({ user }: Props) {
    const { delete: destroy, processing } = useForm();

    const verified = Boolean(user.email_verified_at);
    const createdAt = user.created_at ? new Date(user.created_at as any) : null;
    const updatedAt = user.updated_at ? new Date(user.updated_at as any) : null;
    const { post, processing: sending } = useForm();

    const resend = () => {
        post(UserController.verificationSend.url({ user: user.id }), {
            preserveScroll: true,
        });
    };

    const initials =
        (user.name || "")
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U";

    const onDelete = () => {
        if (
            confirm(
                `¿Eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`
            )
        ) {
            destroy(UserController.destroy.url({ user: user.id }), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Usuarios", href: UserController.index.url() },
                { title: user.name, href: UserController.show.url({ user: user.id }) },
            ]}
        >
            <Head title={`Usuario · ${user.name}`} />

            <div className="container mx-auto px-4 py-6">
                {/* Header con acciones */}
                <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h1 className="text-2xl font-semibold">{user.name}</h1>
                        {verified ? (
                            <Badge variant="outline" className="gap-1">
                                <MailCheck className="h-3.5 w-3.5" /> Verificado
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="gap-1">
                                <MailX className="h-3.5 w-3.5" /> Sin verificar
                            </Badge>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" asChild>
                            <Link href={UserController.index.url()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Link>
                        </Button>

                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" asChild>
                                        <Link href={UserController.edit.url({ user: user.id })}>
                                            <PencilLine className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        onClick={onDelete}
                                        disabled={processing}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                            {!verified && (
                                <Tooltip>
                                    <TooltipTrigger asChild>

                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={resend}
                                            disabled={sending}
                                            aria-label="Reenviar verificación de email"
                                        >
                                            <MailCheck className="h-4 w-4" />

                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>  Reenviar verificación</TooltipContent>
                                </Tooltip>
                            )}

                        </TooltipProvider>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Identidad */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Identidad</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                {/* Avatar simple con iniciales */}
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-xl font-bold">
                                    {initials}
                                </div>
                                <div>
                                    <div className="text-xl font-semibold">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <FieldRow
                                label="Email"
                                value={<span className="break-all">{user.email}</span>}
                                icon={<MailCheck className="h-4 w-4" />}
                            />
                            <FieldRow
                                label="Estado"
                                value={
                                    verified ? (
                                        <Badge variant="outline" className="gap-1">
                                            <MailCheck className="h-3.5 w-3.5" /> Verificado
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1">
                                            <MailX className="h-3.5 w-3.5" /> Sin verificar
                                        </Badge>
                                    )
                                }
                            />
                            <FieldRow
                                label="Creado"
                                value={
                                    createdAt ? (
                                        <span className="text-sm">
                                            <CalendarDays className="mr-1 inline h-4 w-4" />
                                            {createdAt.toLocaleString()}
                                        </span>
                                    ) : (
                                        "—"
                                    )
                                }
                            />
                            <FieldRow
                                label="Actualizado"
                                value={
                                    updatedAt ? (
                                        <span className="text-sm">
                                            <CalendarDays className="mr-1 inline h-4 w-4" />
                                            {updatedAt.toLocaleString()}
                                        </span>
                                    ) : (
                                        "—"
                                    )
                                }
                            />
                        </CardContent>
                    </Card>

                    {/* Acceso y pertenencias */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Acceso y pertenencias</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Roles */}
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Roles</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(user.roles ?? []).length ? (
                                        user.roles!.map((r) => <Badge key={r.id ?? r.name}>{r.name}</Badge>)
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Sin rol asignado</span>
                                    )}
                                </div>
                            </div>

                            {/* Tiendas */}
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Tiendas asignadas</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(user.stores ?? []).length ? (
                                        user.stores!.map((s) => (
                                            <Badge key={s.id} variant="secondary">
                                                {s.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Sin tiendas asignadas</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
