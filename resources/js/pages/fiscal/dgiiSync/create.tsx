/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-self-assign */
import React, { useState, useEffect } from 'react';
import { useForm, Head, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import axios from 'axios';

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, File as FileIcon, X, Loader2, CheckCircle, AlertTriangle, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

// --- Tipos para el estado ---
interface SyncState {
    status: 'idle' | 'pending' | 'processing' | 'finalizing' | 'completed' | 'failed';
    message: string;
    progress: number;
    log: string[];
    stats: Record<string, string>;
}

interface DgiiSyncPageProps extends PageProps {
    flash: {
        sync_cache_key?: string;
        success?: string;
        error?: string;
    };
}

const FileDropzone = ({ file, setFile, error, disabled }: { file: File | null; setFile: (file: File | null) => void; error?: string; disabled: boolean }) => {
    if (file) {
        return (
            <div className="p-4 border rounded-lg flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-medium text-sm truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
                {!disabled && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                error ? "border-destructive" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
            )}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (disabled) return;
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setFile(e.dataTransfer.files[0]);
                    e.dataTransfer.clearData();
                }
            }}
        >
            <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-center">Arrastra y suelta el archivo aquí</p>
            <p className="text-xs text-muted-foreground mt-1">o haz clic para buscarlo (CSV o TXT)</p>
            <Input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => e.target.files && e.target.files.length > 0 && setFile(e.target.files[0])}
                accept=".csv,.txt"
                disabled={disabled}
            />
        </div>
    );
};


export default function DgiiSyncCreatePage() {
    const { flash } = usePage<DgiiSyncPageProps>().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        padron_file: null as File | null,
        source_version: '',
        padron_date: '',
        limit: '',
        dry_run: false,
        sync_customers: true,
    });

    const [syncState, setSyncState] = useState<SyncState>({
        status: 'idle', message: 'Esperando para iniciar...', progress: 0, log: [], stats: {}
    });

    // Usamos el flash message para activar el sondeo
    const activeCacheKey = flash?.sync_cache_key;

    useEffect(() => {
        // Muestra notificaciones iniciales del backend
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (!activeCacheKey) {
            // Si no hay key, reseteamos al estado inicial
            setSyncState({ status: 'idle', message: 'Esperando para iniciar...', progress: 0, log: [], stats: {} });
            return;
        };

        const isJobFinished = ['completed', 'failed'].includes(syncState.status);
        if (isJobFinished) return;

        const intervalId = setInterval(() => {
            axios.get(`/admin/dgii-sync/status?key=${activeCacheKey}`)
                .then(response => {
                    setSyncState(response.data);
                })
                .catch(() => {
                    // No mostramos toast de error en cada fallo de sondeo
                    console.error("Fallo al sondear el estado del job.");
                });
        }, 3000);

        return () => clearInterval(intervalId);

    }, [activeCacheKey, syncState.status]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/dgii-sync', {
            forceFormData: true,
            onError: (formErrors) => {
                const firstError = Object.values(formErrors)[0];
                toast.error("Error de validación", { description: firstError });
            }
        });
    };

    const resetProcess = () => {
        // Redirige a la misma página para limpiar el estado y el flash message
        window.location.href = window.location.href;
    };

    const getStatusIcon = (status: SyncState['status']) => {
        switch (status) {
            case 'pending': return <Clock className="h-5 w-5 text-blue-500" />;
            case 'processing': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'finalizing': return <ListChecks className="h-5 w-5 text-indigo-500" />;
            case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
            default: return null;
        }
    };

    const isProcessing = !!activeCacheKey || syncState.status !== 'idle';
    const hasFinished = ['completed', 'failed'].includes(syncState.status);

    return (
        <AppLayout>
            <Head title="Sincronizar Padrón DGII" />
            <div className="p-4 sm:p-6 lg:p-8">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Sincronizar Padrón de Contribuyentes (DGII)</CardTitle>
                        <CardDescription>
                            Sube el archivo para actualizar la base de datos. El proceso se ejecutará en segundo plano.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isProcessing ? (
                            <div className="space-y-4">
                                <Alert variant={syncState.status === 'failed' ? 'destructive' : 'default'} className="flex items-start gap-4">
                                    {getStatusIcon(syncState.status)}
                                    <div className="flex-1">
                                        <AlertTitle className="font-bold">
                                            {syncState.status.charAt(0).toUpperCase() + syncState.status.slice(1)}
                                        </AlertTitle>
                                        <AlertDescription>{syncState.message}</AlertDescription>
                                    </div>
                                </Alert>

                                {(syncState.status === 'processing' || syncState.status === 'finalizing') && <Progress value={syncState.progress} className="w-full" />}

                                {Object.keys(syncState.stats).length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {Object.entries(syncState.stats).map(([key, value]) => (
                                            <div key={key} className="p-3 bg-muted/50 rounded-lg">
                                                <p className="text-muted-foreground">{key}</p>
                                                <p className="font-semibold text-base">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {syncState.log && syncState.log.length > 0 && (
                                    <div>
                                        <Label>Log del Proceso</Label>
                                        <Textarea
                                            readOnly
                                            value={syncState.log.join('\n')}
                                            className="mt-2 h-40 font-mono text-xs bg-slate-900 text-slate-300"
                                        />
                                    </div>
                                )}
                                {hasFinished && (
                                    <div className="text-center pt-4">
                                        <Button onClick={resetProcess}>Importar Otro Archivo</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <Label htmlFor="padron_file">Archivo del Padrón</Label>
                                    <div className="mt-2">
                                        <FileDropzone
                                            file={data.padron_file}
                                            setFile={(file) => setData('padron_file', file)}
                                            error={errors.padron_file}
                                            disabled={processing}
                                        />
                                    </div>
                                    {errors.padron_file && <p className="text-sm text-destructive mt-2">{errors.padron_file}</p>}
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="source_version">Versión del Padrón (Opcional)</Label>
                                        <Input id="source_version" value={data.source_version} onChange={(e) => setData('source_version', e.target.value)} placeholder="Ej: DGII 2025-09" disabled={processing} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="padron_date">Fecha del Padrón (Opcional)</Label>
                                        <Input id="padron_date" type="date" value={data.padron_date} onChange={(e) => setData('padron_date', e.target.value)} disabled={processing} />
                                    </div>
                                </div>

                                <Card className="bg-muted/50">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="sync_customers" className="font-medium">Sincronizar Clientes</Label>
                                                <p className="text-xs text-muted-foreground">Actualiza la tabla de clientes al finalizar.</p>
                                            </div>
                                            <Checkbox id="sync_customers" checked={data.sync_customers} onCheckedChange={(checked) => setData('sync_customers', !!checked)} disabled={processing} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="dry_run" className="font-medium">Modo de Prueba (Dry Run)</Label>
                                                <p className="text-xs text-muted-foreground">Simula el proceso sin escribir en la DB.</p>
                                            </div>
                                            <Checkbox id="dry_run" checked={data.dry_run} onCheckedChange={(checked) => setData('dry_run', !!checked)} disabled={processing} />
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="limit">Limitar a X Filas (Para Pruebas)</Label>
                                            <Input id="limit" type="number" value={data.limit} onChange={(e) => setData('limit', e.target.value)} placeholder="Procesar solo las primeras N filas" disabled={processing} />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={processing || !data.padron_file} size="lg">
                                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Iniciar Importación
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

