/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Monitor, Search, ShieldCheck, AlertTriangle, Power } from "lucide-react";
import RegisterController from "@/actions/App/Http/Controllers/Cash/RegisterController";
import cash from "@/routes/cash";

type BreadcrumbItem = { title: string; href: string };

type RegisterLite = {
    id: string | number;
    name: string;
    active: boolean;
    store_id: number;
    // opcionales, si tu backend los envía:
    has_open_shift?: boolean;
    opened_by_name?: string | null;
    opened_at?: string | null;
};

interface Props {
    context: {
        active_store_id: number | null;
        active_register: { id: string | number; name: string; store_id: number } | null;
        active_shift_id: string | null;
    };
    registers: RegisterLite[]; // listar sólo de la tienda activa
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Cajas", href: cash.registers.select.url() },
];

export default function SelectRegister({ context, registers }: Props) {
    const [query, setQuery] = React.useState("");
    const [choosing, setChoosing] = React.useState<string | number | null>(null);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? registers.filter(r => r.name.toLowerCase().includes(q) || String(r.id).includes(q))
            : registers;
    }, [query, registers]);

    const choose = (id: string | number) => {
        setChoosing(id);
        router.post(
            RegisterController.setActive.url({ register: Number(id) }),
            { register_id: id },
            {
                onSuccess: () => toast.success("Caja establecida como activa."),
                onError: (err) => {
                    const msg =
                        (err && Object.values(err)[0]) ||
                        "No se pudo establecer la caja. Verifica permisos y que pertenezca a la tienda activa.";
                    toast.error(msg as string);
                },
                onFinish: () => setChoosing(null),
                preserveScroll: true,
            }
        );
    };

    const isStoreMissing = !context?.active_store_id;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Seleccionar Caja" />

            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Monitor className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Seleccionar Caja</h1>
                    </div>
                    {context?.active_register && (
                        <Badge variant="secondary" className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Caja activa: <span className="font-medium">{context.active_register.name}</span>
                        </Badge>
                    )}
                </div>

                {isStoreMissing && (
                    <Card className="mb-6 border-amber-300/60 bg-amber-50 dark:bg-amber-900/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                <AlertTriangle className="h-5 w-5" />
                                Falta seleccionar una tienda
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-amber-800/90 dark:text-amber-100/80">
                            Primero debes seleccionar una tienda para poder elegir una caja.
                        </CardContent>
                    </Card>
                )}

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span>Listado de Cajas</span>
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o ID…"
                                    className="pl-8"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((r) => {
                                const blocked = !r.active;
                                const busy = !!r.has_open_shift;
                                const isCurrent = context?.active_register?.id === r.id;

                                return (
                                    <div
                                        key={r.id}
                                        className={`rounded-xl border p-4 transition hover:shadow-sm ${isCurrent ? "border-primary/60" : "border-border"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="text-sm text-muted-foreground">Caja #{r.id}</div>
                                                <div className="text-base font-semibold">{r.name}</div>
                                            </div>

                                            {isCurrent ? (
                                                <Badge className="bg-primary/90">Actual</Badge>
                                            ) : blocked ? (
                                                <Badge variant="destructive">Inactiva</Badge>
                                            ) : busy ? (
                                                <Badge variant="secondary">Con turno abierto</Badge>
                                            ) : (
                                                <Badge variant="outline">Libre</Badge>
                                            )}
                                        </div>

                                        <Separator className="my-3" />

                                        <div className="space-y-1 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Estado</span>
                                                <span className="font-medium">
                                                    {blocked ? "Inactiva" : busy ? "Ocupada" : "Disponible"}
                                                </span>
                                            </div>
                                            {busy && r.opened_by_name && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Abierta por</span>
                                                    <span className="font-medium">{r.opened_by_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            className="mt-4 w-full gap-2"
                                            disabled={isStoreMissing || blocked || isCurrent}
                                            onClick={() => choose(r.id)}
                                        >
                                            <Power className="h-4 w-4" />
                                            {isCurrent ? "Caja actual" : "Usar esta caja"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        {filtered.length === 0 && (
                            <div className="py-16 text-center text-sm text-muted-foreground">
                                No se encontraron cajas con ese criterio.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
