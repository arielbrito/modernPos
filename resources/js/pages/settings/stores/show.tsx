
import * as React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, useForm } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PencilLine, Trash2, ArrowLeft, StoreIcon, MapPin, Phone, Mail, Hash, Globe } from "lucide-react";
import type { BreadcrumbItem, Store } from "@/types";
import stores from "@/routes/stores";
import { StoreForm, } from "./partials/store-form";


interface Props {
    store: Store;
}

const FieldRow = ({ label, value, icon }: { label: string; value?: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
        {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
        <div className="min-w-28 text-sm text-muted-foreground">{label}</div>
        <div className="flex-1 font-medium">{value ?? "—"}</div>
    </div>
);

export default function StoreShowPage({ store }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Tiendas", href: stores.index.url() },
        { title: store.name, href: stores.show.url({ store: store.id }) },
    ];

    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<Store | null>(null);

    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        // Si usas dialogo de confirmación, colócalo aquí
        destroy(stores.destroy.url({ store: store.id }), {
            preserveScroll: true,
        });
    };

    const handleEdit = (tienda: Store) => {
        setEditing(tienda);
        setOpenForm(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Tienda · ${store.name}`} />
            <div className="container mx-auto px-4 py-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <StoreIcon className="h-6 w-6 text-muted-foreground" />
                        <h1 className="text-2xl font-semibold">{store.name}</h1>
                        <Badge variant={store.is_active ? "default" : "secondary"}>
                            {store.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" asChild>
                            <Link href={stores.index.url()}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver
                            </Link>
                        </Button>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" asChild>
                                        <Button size='icon' variant="secondary" onClick={() => handleEdit(store)} >
                                            <PencilLine className="h-4 w-4" />
                                        </Button>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={processing}
                                        aria-label="Eliminar tienda"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Perfil / Identidad */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Identidad</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                {/* Logo */}
                                <img
                                    src={store.logo_url || "https://via.placeholder.com/96"}
                                    alt={store.name}
                                    className="h-20 w-20 rounded-xl object-cover"
                                />
                                <div>
                                    <div className="text-xl font-semibold">{store.name}</div>
                                    <div className="text-xs text-muted-foreground">{store.code || "—"}</div>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <FieldRow label="RNC" value={store.rnc || "—"} icon={<Hash className="h-4 w-4" />} />
                            <FieldRow label="Moneda" value={store.currency || "—"} icon={<Globe className="h-4 w-4" />} />
                        </CardContent>
                    </Card>

                    {/* Información de contacto */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Información</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <FieldRow label="Teléfono" value={store.phone || "—"} icon={<Phone className="h-4 w-4" />} />
                                <FieldRow label="Email" value={store.email || "—"} icon={<Mail className="h-4 w-4" />} />
                                <div className="md:col-span-2">
                                    <FieldRow
                                        label="Dirección"
                                        value={<span className="whitespace-pre-line">{store.address || "—"}</span>}
                                        icon={<MapPin className="h-4 w-4" />}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Aquí puedes añadir secciones relacionadas: usuarios, cajas, turnos, POS asignados, etc. */}
            </div>
            <StoreForm open={openForm} onOpenChange={setOpenForm} store={editing || undefined} />
        </AppLayout>
    );
}
