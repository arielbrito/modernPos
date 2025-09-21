
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';

import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, File as FileIcon, X, Loader2, CheckCircle, AlertTriangle, Clock, ListChecks, Download, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ----------------------------------------------------------------------------------
// Wayfinder helper: usa route() si existe; si no, fallback a paths.
// ----------------------------------------------------------------------------------
const namedRoutes = {
    create: 'admin.dgii-sync.create',
    store: 'admin.dgii-sync.store',
    status: 'admin.dgii-sync.status',
    cancel: 'admin.dgii-sync.cancel',
    downloadOriginal: 'admin.dgii-sync.download-original',
} as const;

function rf(name: keyof typeof namedRoutes, params?: Record<string, string | number>) {
    const needsKey = name === 'status' || name === 'cancel' || name === 'downloadOriginal';
    const key = params?.key;

    let base: string;
    const routeFn = (typeof window !== 'undefined' && typeof (window as any).route === 'function')
        ? (window as any).route
        : null;

    if (routeFn) {
        base = routeFn(namedRoutes[name]); // no pasar 'key' como param de ruta
    } else {
        switch (name) {
            case 'store': base = '/admin/dgii-sync'; break;
            case 'status': base = '/admin/dgii-sync/status'; break;
            case 'cancel': base = '/admin/dgii-sync/cancel'; break;
            case 'downloadOriginal': base = '/admin/dgii-sync/download-original'; break;
            default: base = '/admin/dgii-sync';
        }
    }

    if (needsKey && key) {
        base += (base.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(String(key));
    }
    return base;
}

// ----------------------------------------------------------------------------------
// Tipos y utilidades
// ----------------------------------------------------------------------------------

type SyncStatus = 'idle' | 'pending' | 'processing' | 'finalizing' | 'completed' | 'failed';

interface SyncState {
    status: SyncStatus;
    message: string;
    progress: number;
    log: string[];
    stats: Record<string, any>;
}

interface FlashBag {
    sync_cache_key?: string;
    success?: string;
    error?: string;
}

interface PageProps {
    flash?: FlashBag;
}

const MAX_HINT_MB = 100;

const prettyKey: Record<string, string> = {
    processed: 'Procesadas',
    total: 'Total',
    rate: 'Velocidad (filas/s)',
    eta_seconds: 'ETA',
    errors: 'Errores',
    skipped_invalid: 'Saltadas',
    mem_mb: 'Mem. (MB)',
    size_mb: 'Tamaño (MB)',
    original_name: 'Archivo',
};

function fmtETA(sec?: number | null) {
    if (!sec && sec !== 0) return '—';
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return [h, m, r].map(v => String(v).padStart(2, '0')).join(':');
}

function csrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    return el?.content ?? '';
}

// ----------------------------------------------------------------------------------
// FileDropzone
// ----------------------------------------------------------------------------------
const FileDropzone: React.FC<{
    file: File | null;
    setFile: (f: File | null) => void;
    error?: string | null;
    disabled?: boolean;
}> = ({ file, setFile, error, disabled = false }) => {
    const onPick = (f: File) => {
        const mb = f.size / 1024 / 1024;
        if (mb > MAX_HINT_MB) {
            toast.warning(`El archivo pesa ${mb.toFixed(1)} MB (> ${MAX_HINT_MB} MB). Considera comprimir a .csv.gz para mejor desempeño.`);
        }
        setFile(f);
    };

    if (file) {
        return (
            <div className="p-4 border rounded-lg flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[260px]" title={file.name}>{file.name}</p>
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
                'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                error ? 'border-destructive' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50',
                disabled && 'cursor-not-allowed opacity-50'
            )}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (disabled) return;
                const f = e.dataTransfer.files?.[0];
                if (f) onPick(f);
            }}
        >
            <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-center">Arrastra y suelta el archivo aquí</p>
            <p className="text-xs text-muted-foreground mt-1">o haz clic para buscarlo (.csv, .txt, .csv.gz)</p>
            <Input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPick(f);
                }}
                accept=".csv,.txt,.gz"
                disabled={disabled}
            />
        </div>
    );
};

// ----------------------------------------------------------------------------------
// Página
// ----------------------------------------------------------------------------------
export default function DgiiSyncCreatePage({ flash }: PageProps) {
    // Estado del formulario
    const [padronFile, setPadronFile] = useState<File | null>(null);
    const [sourceVersion, setSourceVersion] = useState('');
    const [padronDate, setPadronDate] = useState('');
    const [limit, setLimit] = useState<string>('');
    const [dryRun, setDryRun] = useState(false);
    const [syncCustomers, setSyncCustomers] = useState(true);

    // Estado del proceso
    const [syncState, setSyncState] = useState<SyncState>({
        status: 'idle', message: 'Esperando para iniciar...', progress: 0, log: [], stats: {},
    });

    // Key: flash -> localStorage (persistente)
    const [activeKey, setActiveKey] = useState<string | undefined>(() =>
        (flash?.sync_cache_key) || localStorage.getItem('dgii_sync_key') || undefined
    );

    // Polling controller
    const pollingRef = useRef<{ abort?: AbortController; timer?: number }>({});

    // Mensajes flash
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Arrancar polling si ya hay key (p. ej., tras recargar)
    useEffect(() => {
        if (activeKey) {
            startPolling(activeKey);
            setSyncState(s => (s.status === 'idle' ? { ...s, status: 'pending', message: 'Proceso en cola…' } : s));
        }

    }, [activeKey]);

    // startPolling (con backoff suave y abort controller)
    const startPolling = (key: string) => {
        if (!key) return;

        // Limpia ciclo previo
        if (pollingRef.current.abort) pollingRef.current.abort.abort();
        if (pollingRef.current.timer) clearTimeout(pollingRef.current.timer);

        let delay = 1500;
        let cancelled = false;

        const tick = async () => {
            if (cancelled) return;
            try {
                const ctrl = new AbortController();
                pollingRef.current.abort = ctrl;

                const url = rf('status', { key });
                const { data } = await axios.get<SyncState>(url, { signal: ctrl.signal });
                setSyncState(data);

                if (data.status === 'processing') delay = 3200;
                else if (data.status === 'finalizing') delay = 4000;
                else if (data.status === 'pending') delay = 3000;
                else delay = 6000;

                if (data.status === 'completed' || data.status === 'failed') {
                    localStorage.removeItem('dgii_sync_key');
                    cancelled = true;
                    return;
                }
            } catch (e: any) {
                const status = e?.response?.status;
                if (status === 429) delay = Math.min(delay * 1.5, 10000);
            } finally {
                if (!cancelled) {
                    pollingRef.current.timer = window.setTimeout(tick, delay);
                }
            }
        };

        tick();
    };

    // Submit (no recargar; usar JSON si está disponible)
    const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        if (!padronFile) {
            toast.error('Selecciona un archivo');
            return;
        }

        try {
            const fd = new FormData();
            fd.append('padron_file', padronFile);
            if (sourceVersion) fd.append('source_version', sourceVersion);
            if (padronDate) fd.append('padron_date', padronDate);
            if (limit) fd.append('limit', limit);
            fd.append('dry_run', dryRun ? '1' : '0');
            fd.append('sync_customers', syncCustomers ? '1' : '0');

            const { data } = await axios.post(
                rf('store'),
                fd,
                { headers: { 'X-CSRF-TOKEN': csrfToken(), 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } }
            );

            const key = (data?.sync_cache_key ?? flash?.sync_cache_key) as string | undefined;
            const msg = data?.message ?? 'El proceso ha comenzado en segundo plano.';
            toast.success(msg);

            if (key) {
                localStorage.setItem('dgii_sync_key', key);
                setActiveKey(key);
                setSyncState(s => ({ ...s, status: 'pending', message: 'Proceso en cola…' }));
                startPolling(key);
            } else {
                toast.message('Proceso encolado, esperando estado…');
            }
        } catch (err: any) {
            if (err?.response?.data?.errors) {
                const first = Object.values(err.response.data.errors)[0] as string[] | undefined;
                toast.error('Error de validación', { description: first?.[0] ?? 'Revisa los campos.' });
            } else {
                toast.error('No se pudo iniciar el proceso.');
            }
        }
    };

    const resetProcess = () => {
        localStorage.removeItem('dgii_sync_key');
        setActiveKey(undefined);
        setPadronFile(null);
        setSourceVersion('');
        setPadronDate('');
        setLimit('');
        setDryRun(false);
        setSyncCustomers(true);
        setSyncState({ status: 'idle', message: 'Esperando para iniciar...', progress: 0, log: [], stats: {} });
        if (pollingRef.current.abort) pollingRef.current.abort.abort();
        if (pollingRef.current.timer) clearTimeout(pollingRef.current.timer);
    };

    const cancelProcess = async () => {
        if (!activeKey) return;
        try {
            await axios.post(rf('cancel', { key: activeKey }), undefined, { headers: { 'X-CSRF-TOKEN': csrfToken() } });
            toast.message('Cancelación solicitada');
        } catch (e) {
            toast.error('No se pudo cancelar');
        }
    };

    const downloadOriginal = () => {
        if (!activeKey) return;
        window.open(rf('downloadOriginal', { key: activeKey }), '_blank');
    };

    const isProcessing = !!activeKey || syncState.status !== 'idle';
    const hasFinished = syncState.status === 'completed' || syncState.status === 'failed';

    const getStatusIcon = (status: SyncStatus) => {
        switch (status) {
            case 'pending': return <Clock className="h-5 w-5 text-blue-500" />;
            case 'processing': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'finalizing': return <ListChecks className="h-5 w-5 text-indigo-500" />;
            case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
            default: return null;
        }
    };

    const niceStats = useMemo(() => {
        const s = syncState.stats || {};
        const eta = fmtETA(s.eta_seconds);
        const entries: Array<[string, string]> = [];
        const order = ['original_name', 'size_mb', 'processed', 'total', 'rate', 'eta_seconds', 'errors', 'skipped_invalid', 'mem_mb'];

        for (const k of order) {
            if (s[k] === undefined) continue;
            let v: any = s[k];
            if (k === 'rate') v = Number(v).toFixed(1);
            if (k === 'size_mb') v = Number(v).toFixed(2);
            if (k === 'eta_seconds') v = eta;
            entries.push([prettyKey[k] ?? k, String(v)]);
        }

        Object.entries(s).forEach(([k, v]) => {
            if (order.includes(k)) return;
            if (typeof v === 'object') return;
            entries.push([prettyKey[k] ?? k, String(v)]);
        });

        return entries;
    }, [syncState.stats]);

    return (
        <AppLayout>
            <Head title="Sincronizar Padrón DGII" />
            <div className="p-4 sm:p-6 lg:p-8">
                <Card className="max-w-5xl mx-auto border-border/60 shadow-sm">
                    <CardHeader className="space-y-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>Sincronizar Padrón de Contribuyentes (DGII)</CardTitle>
                                <CardDescription>Sube el archivo y ejecutaremos la importación en segundo plano sin bloquear la UI.</CardDescription>
                            </div>
                            {activeKey && (
                                <Badge variant="outline" className="text-xs">key: {activeKey.slice(0, 8)}…</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isProcessing ? (
                            <div className="space-y-5">
                                <Alert variant={syncState.status === 'failed' ? 'destructive' : 'default'} className="flex items-start gap-4">
                                    {getStatusIcon(syncState.status)}
                                    <div className="flex-1">
                                        <AlertTitle className="font-semibold">
                                            {syncState.status.charAt(0).toUpperCase() + syncState.status.slice(1)}
                                        </AlertTitle>
                                        <AlertDescription className="whitespace-pre-line">{syncState.message}</AlertDescription>
                                    </div>
                                </Alert>

                                {(syncState.status === 'processing' || syncState.status === 'finalizing') && (
                                    <div className="space-y-2">
                                        <Progress value={syncState.progress} className="w-full" />
                                        <div className="text-xs text-muted-foreground">{syncState.progress}%</div>
                                    </div>
                                )}

                                {niceStats.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {niceStats.map(([k, v]) => (
                                            <div key={k} className="p-3 rounded-lg bg-muted/60 border">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                                                <p className="font-semibold text-base leading-tight break-words">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {syncState.log?.length > 0 && (
                                    <div>
                                        <Label>Log del Proceso</Label>
                                        <Textarea
                                            readOnly
                                            value={syncState.log.join('\n')}
                                            className="mt-2 h-48 font-mono text-xs bg-slate-950 text-slate-200"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <Button variant="outline" onClick={downloadOriginal} disabled={!activeKey}>
                                        <Download className="h-4 w-4 mr-2" /> Descargar original
                                    </Button>
                                    {!(syncState.status === 'completed' || syncState.status === 'failed') && (
                                        <Button variant="destructive" onClick={cancelProcess}>
                                            <StopCircle className="h-4 w-4 mr-2" /> Cancelar
                                        </Button>
                                    )}
                                    {hasFinished && (
                                        <Button onClick={resetProcess}>Importar Otro Archivo</Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={onSubmit} className="space-y-6">
                                <div>
                                    <Label htmlFor="padron_file">Archivo del Padrón</Label>
                                    <div className="mt-2">
                                        <FileDropzone file={padronFile} setFile={setPadronFile} error={null} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Recomendado: comprimir a <code>.csv.gz</code> para cargas grandes (&gt; {MAX_HINT_MB} MB).
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="source_version">Versión del Padrón (Opcional)</Label>
                                        <Input id="source_version" value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)} placeholder="Ej: DGII 2025-09" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="padron_date">Fecha del Padrón (Opcional)</Label>
                                        <Input id="padron_date" type="date" value={padronDate} onChange={(e) => setPadronDate(e.target.value)} />
                                    </div>
                                </div>

                                <Card className="bg-muted/40">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="sync_customers" className="font-medium">Sincronizar Clientes</Label>
                                                <p className="text-xs text-muted-foreground">Actualiza la tabla de clientes al finalizar.</p>
                                            </div>
                                            <Checkbox id="sync_customers" checked={syncCustomers} onCheckedChange={(c) => setSyncCustomers(!!c)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="dry_run" className="font-medium">Modo de Prueba (Dry Run)</Label>
                                                <p className="text-xs text-muted-foreground">Simula el proceso sin escribir en la DB.</p>
                                            </div>
                                            <Checkbox id="dry_run" checked={dryRun} onCheckedChange={(c) => setDryRun(!!c)} />
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="limit">Limitar a X Filas (Para Pruebas)</Label>
                                            <Input id="limit" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Procesar solo las primeras N filas" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={!padronFile} size="lg">
                                        <Loader2 className="mr-2 h-4 w-4 hidden data-[loading=true]:inline animate-spin" />
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
