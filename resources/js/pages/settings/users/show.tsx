/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, useForm } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    Clock,
    Crown,
    Building2,
    Send,
    AlertCircle,
    CheckCircle2,
    Copy,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
import UserController from "@/actions/App/Http/Controllers/Settings/UserController";

// Si tienes estos tipos en "@/types", úsalos:
import type { User, Role, Store } from "@/types";

// Helper mejorado para filas de detalle con mejor UI
const FieldRow = ({
    label,
    value,
    icon,
    copyable = false,
    className = "",
}: {
    label: string;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    copyable?: boolean;
    className?: string;
}) => {
    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copiado al portapapeles");
        } catch {
            toast.error("No se pudo copiar");
        }
    };

    return (
        <div className={`flex items-start gap-4 py-3 px-1 rounded-lg hover:bg-muted/30 transition-colors ${className}`}>
            {icon && (
                <div className="mt-0.5 p-1.5 rounded-md bg-muted/50">
                    {icon}
                </div>
            )}
            <div className="min-w-24 text-sm font-medium text-muted-foreground">
                {label}
            </div>
            <div className="flex-1 flex items-center gap-2">
                <div className="font-medium text-sm">{value ?? "—"}</div>
                {copyable && typeof value === 'string' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopy(value)}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
};

// Componente de estado de verificación mejorado
const VerificationStatus = ({ verified, onResend, isLoading }: {
    verified: boolean;
    onResend: () => void;
    isLoading: boolean;
}) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${verified
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
        {verified ? (
            <>
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Email Verificado</span>
            </>
        ) : (
            <>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Verificación Pendiente</span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 px-2 text-xs hover:bg-yellow-100"
                    onClick={onResend}
                    disabled={isLoading}
                >
                    <Send className="h-3 w-3 mr-1" />
                    Reenviar
                </Button>
            </>
        )}
    </div>
);

// Componente de avatar mejorado
const UserAvatar = ({ user, size = 'lg' }: { user: UserWithRels; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
    const initials = (user.name || "")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    const sizeClasses = {
        sm: 'h-8 w-8 text-sm',
        md: 'h-12 w-12 text-base',
        lg: 'h-20 w-20 text-xl',
        xl: 'h-32 w-32 text-3xl'
    };

    return (
        <Avatar className={`${sizeClasses[size]} ring-2 ring-muted shadow-lg`}>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold">
                {initials}
            </AvatarFallback>
        </Avatar>
    );
};

// Componente de métricas/stats
const UserStats = ({ user, verified }: { user: UserWithRels; verified: boolean }) => {
    const stats = [
        {
            label: 'Roles Asignados',
            value: user.roles?.length || 0,
            icon: Crown,
            color: 'text-blue-600'
        },
        {
            label: 'Tiendas Asignadas',
            value: user.stores?.length || 0,
            icon: Building2,
            color: 'text-green-600'
        },
        {
            label: 'Estado',
            value: verified ? 'Activo' : 'Pendiente',
            icon: verified ? CheckCircle2 : AlertCircle,
            color: verified ? 'text-green-600' : 'text-yellow-600'
        }
    ];

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 rounded-lg bg-muted/30 border">
                    <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
            ))}
        </div>
    );
};

type UserWithRels = User & {
    roles?: Array<Pick<Role, "id" | "name">>;
    stores?: Array<Pick<Store, "id" | "name">>;
};

interface Props {
    user: UserWithRels;
}

export default function UserShow({ user }: Props) {
    const { delete: destroy, processing } = useForm();
    const { post, processing: sending } = useForm();
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const verified = Boolean(user.email_verified_at);
    const createdAt = user.created_at ? new Date(user.created_at as any) : null;
    const updatedAt = user.updated_at ? new Date(user.updated_at as any) : null;

    const resend = () => {
        post(UserController.resendVerification.url({ user: user.id }), {
            preserveScroll: true,
            onSuccess: () => toast.success("Verificación reenviada correctamente"),
            onError: () => toast.error("Error al reenviar verificación"),
        });
    };

    const onDelete = () => {
        if (showDeleteConfirm) {
            destroy(UserController.destroy.url({ user: user.id }), {
                preserveScroll: true,
                onSuccess: () => toast.success("Usuario eliminado correctamente"),
                onError: () => toast.error("Error al eliminar usuario"),
            });
        } else {
            setShowDeleteConfirm(true);
            setTimeout(() => setShowDeleteConfirm(false), 3000);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    };

    const daysSinceCreated = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <AppLayout
            breadcrumbs={[
                { title: "Usuarios", href: UserController.index.url() },
                { title: user.name, href: UserController.show.url({ user: user.id }) },
            ]}
        >
            <Head title={`${user.name} - Perfil de Usuario`} />

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header Premium */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <UserAvatar user={user} size="xl" />
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold">{user.name}</h1>
                                    {verified ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Verificado
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Pendiente
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <CalendarDays className="h-4 w-4" />
                                        Miembro desde hace {daysSinceCreated} días
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <UserIcon className="h-4 w-4" />
                                        ID: {user.id}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="ghost" asChild className="w-full sm:w-auto">
                                <Link href={UserController.index.url()}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver al listado
                                </Link>
                            </Button>

                            <div className="flex gap-2">
                                <TooltipProvider delayDuration={300}>
                                    {!verified && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={resend}
                                                    disabled={sending}
                                                    className="hover:bg-blue-50 hover:border-blue-200"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Reenviar verificación de email</TooltipContent>
                                        </Tooltip>
                                    )}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" asChild className="hover:bg-blue-50 hover:border-blue-200">
                                                <Link href={UserController.edit.url({ user: user.id })}>
                                                    <PencilLine className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Editar usuario</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={showDeleteConfirm ? "destructive" : "outline"}
                                                size="icon"
                                                onClick={onDelete}
                                                disabled={processing}
                                                className={showDeleteConfirm
                                                    ? "animate-pulse"
                                                    : "hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {showDeleteConfirm ? "Confirmar eliminación" : "Eliminar usuario"}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
                </div>

                {/* Stats Cards */}
                <UserStats user={user} verified={verified} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Información Personal */}
                    <Card className="lg:col-span-5 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                Información Personal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 group">
                            <FieldRow
                                label="Nombre"
                                value={user.name}
                                icon={<UserIcon className="h-4 w-4 text-muted-foreground" />}
                                copyable
                            />
                            <FieldRow
                                label="Email"
                                value={user.email}
                                icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                                copyable
                            />
                            <FieldRow
                                label="ID Sistema"
                                value={`#${user.id}`}
                                icon={<UserIcon className="h-4 w-4 text-muted-foreground" />}
                                copyable
                            />
                        </CardContent>
                    </Card>

                    {/* Estado y Verificación */}
                    <Card className="lg:col-span-7 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Estado de la Cuenta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <VerificationStatus
                                verified={verified}
                                onResend={resend}
                                isLoading={sending}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldRow
                                    label="Creado"
                                    value={createdAt ? formatDate(createdAt) : "—"}
                                    icon={<CalendarDays className="h-4 w-4 text-green-600" />}
                                />
                                <FieldRow
                                    label="Actualizado"
                                    value={updatedAt ? formatDate(updatedAt) : "—"}
                                    icon={<Clock className="h-4 w-4 text-blue-600" />}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Roles y Permisos */}
                    <Card className="lg:col-span-6 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-600" />
                                Roles y Permisos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(user.roles ?? []).length > 0 ? (
                                <div className="space-y-3">
                                    {user.roles!.map((role) => (
                                        <div
                                            key={role.id ?? role.name}
                                            className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                                        >
                                            <div className="p-2 rounded-md bg-amber-100">
                                                <Crown className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-amber-800">{role.name}</div>
                                                <div className="text-xs text-amber-600">Rol del sistema</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                                    <p className="text-muted-foreground">Sin roles asignados</p>
                                    <p className="text-sm text-muted-foreground">El usuario no tiene permisos especiales</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tiendas Asignadas */}
                    <Card className="lg:col-span-6 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-green-600" />
                                Tiendas Asignadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(user.stores ?? []).length > 0 ? (
                                <div className="space-y-3">
                                    {user.stores!.map((store) => (
                                        <div
                                            key={store.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                                        >
                                            <div className="p-2 rounded-md bg-green-100">
                                                <Building2 className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-green-800">{store.name}</div>
                                                <div className="text-xs text-green-600">Acceso autorizado</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                                    <p className="text-muted-foreground">Sin tiendas asignadas</p>
                                    <p className="text-sm text-muted-foreground">El usuario no tiene acceso a ninguna tienda</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}