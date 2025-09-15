import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PencilLine,
    Trash2,
    ArrowLeft,
    StoreIcon,
    MapPin,
    Phone,
    Mail,
    Hash,
    Globe,
    Calendar,
    Clock,
    Copy,
    CheckCircle,
    AlertTriangle,
    Settings,
    Users,
    CreditCard,
    BarChart3,
    History
} from "lucide-react";
import type { BreadcrumbItem, Store } from "@/types";
import stores from "@/routes/stores";
import { StoreForm } from "./partials/store-form";
import { DeleteStoreDialog } from "./partials/delete-store-dialog";
import { cn } from "@/lib/utils";

interface Props {
    store: Store;
}

// Componente para mostrar campos de información
const InfoField = ({
    label,
    value,
    icon,
    copyable = false
}: {
    label: string;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    copyable?: boolean;
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        if (copyable && value && typeof value === 'string') {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="group flex items-start gap-3 py-3 px-1 rounded-lg hover:bg-muted/50 transition-colors">
            {icon && (
                <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground mb-1">{label}</div>
                <div className="font-medium text-sm break-words">
                    {value ?? (
                        <span className="text-muted-foreground italic">No especificado</span>
                    )}
                </div>
            </div>
            {copyable && value && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button>
            )}
        </div>
    );
};

// Componente para mostrar estadísticas rápidas
const StatCard = ({
    title,
    value,
    icon,
    variant = "default"
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger";
}) => {
    const variants = {
        default: "border-border",
        success: "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800",
        warning: "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800",
        danger: "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
    };

    return (
        <div className={cn("p-4 rounded-lg border", variants[variant])}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-background border">
                    {icon}
                </div>
                <div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-sm text-muted-foreground">{title}</div>
                </div>
            </div>
        </div>
    );
};

export default function StoreShowPage({ store }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Tiendas", href: stores.index.url() },
        { title: store.name, href: "#" },
    ];

    const [openForm, setOpenForm] = React.useState(false);
    const [openDelete, setOpenDelete] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("overview");

    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        setOpenDelete(true);
    };

    const handleEdit = () => {
        setOpenForm(true);
    };

    const confirmDelete = () => {
        destroy(stores.destroy.url({ store: store.id }), {
            preserveScroll: true,
            onSuccess: () => {
                router.visit(stores.index.url());
            }
        });
    };

    // Función para generar iniciales del nombre
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    // Formatear fechas
    const formatDate = (dateString?: string) => {
        if (!dateString) return "No disponible";
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${store.name} - Detalles de Tienda`} />

            <div className="container mx-auto px-4 py-6">
                {/* Header con acciones */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={stores.index.url()}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a tiendas
                            </Link>
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <StoreIcon className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <h1 className="text-2xl font-bold">{store.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                {store.code ? `Código: ${store.code}` : "Gestión de tienda"}
                            </p>
                        </div>
                        <Badge variant={store.is_active ? "default" : "secondary"} className="ml-2">
                            {store.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    </div>

                    <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={handleEdit}>
                                        <PencilLine className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar información de la tienda</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDelete}
                                        disabled={processing}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar tienda permanentemente</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Alerta de estado */}
                {!store.is_active && (
                    <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Esta tienda está marcada como inactiva. Los usuarios no podrán realizar operaciones hasta que se reactive.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Estado"
                        value={store.is_active ? "Activa" : "Inactiva"}
                        icon={<StoreIcon className="h-4 w-4" />}
                        variant={store.is_active ? "success" : "warning"}
                    />
                    <StatCard
                        title="Moneda"
                        value={store.currency || "No definida"}
                        icon={<Globe className="h-4 w-4" />}
                    />
                    <StatCard
                        title="Usuarios"
                        value="0" // Esto vendría de props o API
                        icon={<Users className="h-4 w-4" />}
                    />
                    <StatCard
                        title="POS Activos"
                        value="0" // Esto vendría de props o API
                        icon={<CreditCard className="h-4 w-4" />}
                    />
                </div>

                {/* Contenido principal con tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                        <TabsTrigger value="overview" className="gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline m-1">General</span>
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Usuarios</span>
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Actividad</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="h-4 w-4" />
                            <span className="hidden sm:inline">Historial</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab de información general */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Identidad de la tienda */}
                            <Card className="lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StoreIcon className="h-5 w-5" />
                                        Identidad
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 mb-6">
                                        <Avatar className="h-20 w-20">
                                            <AvatarImage
                                                src={store.logo_url}
                                                alt={`Logo de ${store.name}`}
                                            />
                                            <AvatarFallback className="text-xl font-bold">
                                                {getInitials(store.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold truncate">{store.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {store.code || "Sin código asignado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <InfoField
                                            label="RNC / Identificación"
                                            value={store.rnc}
                                            icon={<Hash className="h-4 w-4" />}
                                            copyable={!!store.rnc}
                                        />
                                        <InfoField
                                            label="Moneda principal"
                                            value={store.currency}
                                            icon={<Globe className="h-4 w-4" />}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Información de contacto */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Phone className="h-5 w-5" />
                                        Información de Contacto
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField
                                            label="Número de teléfono"
                                            value={store.phone}
                                            icon={<Phone className="h-4 w-4" />}
                                            copyable={!!store.phone}
                                        />
                                        <InfoField
                                            label="Correo electrónico"
                                            value={store.email}
                                            icon={<Mail className="h-4 w-4" />}
                                            copyable={!!store.email}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <InfoField
                                            label="Dirección física"
                                            value={store.address ? (
                                                <span className="whitespace-pre-line">{store.address}</span>
                                            ) : undefined}
                                            icon={<MapPin className="h-4 w-4" />}
                                            copyable={!!store.address}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Información del sistema */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Información del Sistema
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InfoField
                                        label="Fecha de creación"
                                        value={formatDate(store.created_at)}
                                        icon={<Calendar className="h-4 w-4" />}
                                    />
                                    <InfoField
                                        label="Última actualización"
                                        value={formatDate(store.updated_at)}
                                        icon={<Clock className="h-4 w-4" />}
                                    />
                                    <InfoField
                                        label="ID interno"
                                        value={store.id?.toString()}
                                        icon={<Hash className="h-4 w-4" />}
                                        copyable={!!store.id}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab de usuarios */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuarios Asignados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Funcionalidad de usuarios en desarrollo</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab de actividad */}
                    <TabsContent value="activity">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actividad Reciente</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Dashboard de actividad en desarrollo</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab de historial */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Cambios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Historial de cambios en desarrollo</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modales */}
            <StoreForm
                open={openForm}
                onOpenChange={setOpenForm}
                store={store}
            />
            <DeleteStoreDialog
                open={openDelete}
                onOpenChange={setOpenDelete}
                storeId={store.id}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}