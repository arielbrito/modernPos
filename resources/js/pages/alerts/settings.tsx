import * as React from 'react';
import axios, { AxiosError } from 'axios';
import { Head, usePage, useForm } from '@inertiajs/react'; // <-- 1. Importar useForm
import { toast } from 'sonner';
import { PageProps as InertiaPageProps } from '@inertiajs/core';

// ... (El resto de las importaciones de componentes permanecen igual)
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Send, ChevronDown } from 'lucide-react';
import { update, test } from '@/actions/App/Http/Controllers/Notifications/AlertSettingController';

// --- TYPES (Assume they are defined here) ---
type QuietHours = { start: string; end: string; tz: string };
type StoreOverrides = { low_stock: number[]; ncf: number[] };
type Settings = {
    low_stock_enabled: boolean;
    ncf_enabled: boolean;
    low_stock_threshold: number;
    ncf_threshold: number;
    channels: string[];
    overrides: { stores: StoreOverrides };
    quiet_hours: QuietHours;
};
type Store = { id: number; code: string; name: string };
interface CustomPageProps {
    settings: Partial<Settings>;
    stores: Store[];
    allowed_channels: string[];
    flash?: { success?: string; error?: string };
}
type PageProps = CustomPageProps & InertiaPageProps;


// --- UTILS (Assume they are defined here) ---
const named = { update: update.url(), test: test.url() } as const;
function rf(name: keyof typeof named) {
    if (typeof window !== 'undefined' && typeof (window as any).route === 'function') {
        return (window as any).route(named[name]);
    }
    return name === 'test' ? '/settings/alerts/test' : '/settings/alerts';
}
function csrf(): string {
    const el = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    return el?.content ?? '';
}


// --- COMPONENT ---
export default function AlertsSettingsPage() {
    const { props } = usePage<PageProps>();

    // 2. Reemplazar useState con useForm.
    // 'data' es nuestro nuevo objeto de formulario.
    // 'setData' es para actualizarlo.
    // 'put' es la función para enviar el formulario.
    // 'processing' es nuestro nuevo estado de carga.
    const { data, setData, put, processing } = useForm<Settings>(() => {
        const { settings } = props;
        return {
            low_stock_enabled: settings.low_stock_enabled ?? false,
            ncf_enabled: settings.ncf_enabled ?? false,
            low_stock_threshold: settings.low_stock_threshold ?? 0,
            ncf_threshold: settings.ncf_threshold ?? 0,
            channels: settings.channels ?? [],
            overrides: settings.overrides ?? { stores: { low_stock: [], ncf: [] } },
            quiet_hours: settings.quiet_hours ?? { start: '', end: '', tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
        };
    });

    // El estado 'testing' para los botones de prueba se mantiene local.
    const [testing, setTesting] = React.useState<'low_stock' | 'ncf' | null>(null);

    // El useEffect para los mensajes flash ya funciona perfectamente con Inertia.
    React.useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.flash?.error) toast.error(props.flash.error);
    }, [props.flash]);

    // --- STATE HANDLERS (ahora usan setData) ---
    const toggleChannel = (channel: string) => {
        const channels = new Set(data.channels);
        channels.has(channel) ? channels.delete(channel) : channels.add(channel);
        setData('channels', Array.from(channels));
    };

    const toggleStore = (kind: keyof StoreOverrides, storeId: number) => {
        const storeIds = new Set(data.overrides.stores[kind]);
        storeIds.has(storeId) ? storeIds.delete(storeId) : storeIds.add(storeId);
        // Para actualizar un objeto anidado, es más seguro pasar una función a setData.
        setData(currentData => ({
            ...currentData,
            overrides: {
                ...currentData.overrides,
                stores: {
                    ...currentData.overrides.stores,
                    [kind]: Array.from(storeIds)
                }
            }
        }));
    };

    // --- API CALLS ---
    // La función 'save' ahora es mucho más simple.
    const save = (e: React.FormEvent) => {
        e.preventDefault(); // Prevenimos el comportamiento por defecto del formulario.
        if (data.channels.length === 0) {
            toast.error('Debes seleccionar al menos un canal para guardar las preferencias.');
            return;
        }

        // 3. Usamos el método 'put' de useForm.
        // Inertia se encarga del resto: la llamada, la redirección y la actualización de props.
        put(rf('update'), {
            preserveScroll: true, // Evita que la página salte al principio.
            // Los mensajes flash se manejan automáticamente por el useEffect de arriba.
        });
    };

    // La función de prueba sigue usando axios porque es una API pura que no redirige.
    const sendTest = (type: 'low_stock' | 'ncf', channel: string) => {
        setTesting(type);
        axios.post(rf('test'), { channels: [channel], type }, { headers: { 'X-CSRF-TOKEN': csrf() } })
            .then(() => toast.success(`Prueba enviada al canal '${channel}'`))
            .catch((error: AxiosError<{ message: string }>) => {
                const msg = error.response?.data?.message ?? 'No se pudo enviar la prueba';
                toast.error(msg);
            })
            .finally(() => setTesting(null));
    };

    return (
        // El JSX necesita un pequeño cambio: el botón de Guardar ahora está en un <form>
        <AppLayout>
            <Head title="Preferencias de Alertas" />
            <form onSubmit={save} className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Alertas del sistema</CardTitle>
                        <CardDescription>Configura umbrales, canales y filtros por tienda.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* --- Channels Section --- */}
                        <section className="space-y-3">
                            <Label className="text-sm font-semibold">Canales</Label>
                            <div className="flex flex-wrap gap-3">
                                {props.allowed_channels?.map((ch) => (
                                    <label key={ch} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-accent">
                                        <Checkbox checked={data.channels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                                        <span className="capitalize">{ch}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                <Badge variant="outline">database</Badge> muestra en la campana · <Badge variant="outline">mail</Badge> envía correo · <Badge variant="outline">broadcast</Badge> tiempo real (Reverb).
                            </p>
                        </section>
                        <Separator />
                        {/* --- Low stock --- */}
                        <AlertConfigSection
                            title="Alerta de Stock Bajo"
                            description="Notifica cuando una variante tenga poco stock."
                            enabled={data.low_stock_enabled}
                            onEnabledChange={(v) => setData('low_stock_enabled', v)}
                            threshold={data.low_stock_threshold}
                            onThresholdChange={(v) => setData('low_stock_threshold', v)}
                            stores={props.stores}
                            selectedStoreIds={data.overrides.stores.low_stock}
                            onStoreToggle={(id) => toggleStore('low_stock', id)}
                        />
                        <Separator />
                        {/* --- NCF --- */}
                        <AlertConfigSection
                            title="Alerta de NCF por agotarse"
                            description="Secuencias con pocos comprobantes restantes."
                            enabled={data.ncf_enabled}
                            onEnabledChange={(v) => setData('ncf_enabled', v)}
                            threshold={data.ncf_threshold}
                            onThresholdChange={(v) => setData('ncf_threshold', v)}
                            stores={props.stores}
                            selectedStoreIds={data.overrides.stores.ncf}
                            onStoreToggle={(id) => toggleStore('ncf', id)}
                        />
                        <Separator />
                        {/* --- Quiet hours --- */}
                        <section className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Horario silencioso (inicio)</Label>
                                <Input type="time" value={data.quiet_hours.start} onChange={(e) => setData(d => ({ ...d, quiet_hours: { ...d.quiet_hours, start: e.target.value } }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Horario silencioso (fin)</Label>
                                <Input type="time" value={data.quiet_hours.end} onChange={(e) => setData(d => ({ ...d, quiet_hours: { ...d.quiet_hours, end: e.target.value } }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Zona horaria</Label>
                                <Input value={data.quiet_hours.tz} onChange={(e) => setData(d => ({ ...d, quiet_hours: { ...d.quiet_hours, tz: e.target.value } }))} />
                            </div>
                        </section>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <TestButton type="low_stock" selectedChannels={data.channels} onTest={sendTest} isLoading={testing === 'low_stock'} disabled={testing !== null} />
                            <TestButton type="ncf" selectedChannels={data.channels} onTest={sendTest} isLoading={testing === 'ncf'} disabled={testing !== null} />
                            <ActionButton
                                type="submit" // 4. El botón ahora es de tipo 'submit'
                                onClick={() => { }} // onClick ya no es necesario
                                isLoading={processing} // 5. Usamos 'processing' de useForm
                                disabled={processing || data.channels.length === 0}
                                icon={Save}
                            >
                                Guardar
                            </ActionButton>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
}


// --- SUB-COMPONENTS ---
const TestButton: React.FC<{
    type: 'low_stock' | 'ncf';
    selectedChannels: string[];
    onTest: (type: 'low_stock' | 'ncf', channel: string) => void;
    isLoading: boolean;
    disabled: boolean;
}> = ({ type, selectedChannels, onTest, isLoading, disabled }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || selectedChannels.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Probar {type === 'low_stock' ? 'Stock' : 'NCF'}
                <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            {selectedChannels.map(ch => (
                <DropdownMenuItem key={ch} onClick={() => onTest(type, ch)}>
                    <span className="capitalize">Enviar a {ch}</span>
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
);

const ActionButton: React.FC<{
    onClick: () => void;
    isLoading: boolean;
    disabled: boolean;
    type?: "button" | "submit" | "reset";
    icon: React.ElementType;
    children: React.ReactNode;
}> = ({ onClick, isLoading, disabled, type = "button", icon: Icon, children }) => (
    <Button onClick={onClick} disabled={disabled} type={type}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
        {children}
    </Button>
);

const AlertConfigSection: React.FC<{
    title: string;
    description: string;
    enabled: boolean;
    onEnabledChange: (value: boolean) => void;
    threshold: number;
    onThresholdChange: (value: number) => void;
    stores: Store[];
    selectedStoreIds: number[];
    onStoreToggle: (id: number) => void;
}> = ({ title, description, enabled, onEnabledChange, threshold, onThresholdChange, stores, selectedStoreIds, onStoreToggle }) => (
    <section className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-sm font-semibold">{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={onEnabledChange} />
            </div>
            <div className="space-y-2">
                <Label>Umbral</Label>
                <Input
                    type="number"
                    value={threshold}
                    min={0}
                    onChange={(e) => onThresholdChange(Number(e.target.value))}
                    className="max-w-[200px]"
                />
            </div>
        </div>
        <div className="space-y-2">
            <Label>Tiendas incluidas</Label>
            <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto p-2 border rounded-lg">
                {stores.map(s => (
                    <label key={s.id} className="inline-flex items-center gap-2 cursor-pointer">
                        <Checkbox
                            checked={selectedStoreIds.includes(s.id)}
                            onCheckedChange={() => onStoreToggle(s.id)}
                        />
                        <span className="text-sm">{s.code} — {s.name}</span>
                    </label>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">Si no seleccionas nada, aplica a todas las tiendas.</p>
        </div>
    </section>
);

