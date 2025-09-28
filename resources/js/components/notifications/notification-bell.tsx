/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import axios, { AxiosError } from 'axios';
import {
    Bell, CheckCheck, Loader2, Trash2, Sparkles, Clock, Eye, RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

// 👉 SI tienes Wayfinder generado (resources/js/routes/index.ts) descomenta esto:
// import { route } from '@/routes';

// ----------------------------------------------------------------------------------
// Rutas (Wayfinder + fallback)
// ----------------------------------------------------------------------------------
const paths = {
    // Backend JSON para la campana (dropdown)
    dropdown: /* route ? route('notifications.dropdown') : */ '/notifications/dropdown',
    markAll:  /* route ? route('notifications.mark-all') : */ '/notifications/read-all',
    markOne: (id: string) => /* route ? route('notifications.mark', { id }) : */ `/notifications/${id}/read`,
    destroy: (id: string) => /* route ? route('notifications.destroy', { id }) : */ `/notifications/${id}`,
    index:    /* route ? route('notifications.index') : */ '/notifications',
};

// ----------------------------------------------------------------------------------

type NotificationItem = {
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
};

type DropdownPayload = {
    unread_count: number;
    items: {
        unread: NotificationItem[];
        read: NotificationItem[];
    };
};

const AXIOS_OPTS = {
    withCredentials: true,
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    timeout: 10000,
} as const;

const POLL_INTERVAL = 60000; // 1 min
const MAX_DISPLAY_COUNT = 99;

// Helpers
const titleOf = (n: NotificationItem): string =>
    n.data?.title ?? (n.type.split('\\').pop() ?? 'Notificación');

const messageOf = (n: NotificationItem): string =>
    n.data?.message ?? '';

const whenOf = (n: NotificationItem): string => {
    try {
        const date = new Date(n.created_at);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
        return date.toLocaleDateString();
    } catch {
        return '';
    }
};

const formatUnreadCount = (count: number): string =>
    count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : count.toString();

interface NotificationBellProps {
    enablePolling?: boolean;
    maxNotifications?: number;
    onNotificationClick?: (notification: NotificationItem) => void;
    // Si activaste Echo en tu app, puedes pasar el userId y set enableRealtime=true
    enableRealtime?: boolean;
    userId?: number;
}

export default function NotificationBell({
    enablePolling = false,
    maxNotifications = 20,
    onNotificationClick,
    enableRealtime = false,
    userId,
}: NotificationBellProps = {}) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [payload, setPayload] = React.useState<DropdownPayload | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    // 👇 En el navegador, el id de intervalo es number
    const pollIntervalRef = React.useRef<number | null>(null);

    // Estado para optimistic updates
    const [optimistic, setOptimistic] = React.useState<{
        markingAsRead: Set<string>;
        removing: Set<string>;
    }>({
        markingAsRead: new Set(),
        removing: new Set(),
    });

    const load = React.useCallback(async (showToastOnError = false) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get<DropdownPayload>(paths.dropdown, AXIOS_OPTS);
            setPayload(data);
        } catch (err) {
            const errorMessage =
                err instanceof AxiosError
                    ? err.response?.data?.message || 'Error al cargar notificaciones'
                    : 'Error de conexión';
            setError(errorMessage);
            if (showToastOnError) toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadRef = React.useRef(load); // Crea una ref para la función load
    const openRef = React.useRef(open); // Crea una ref para el estado 'open'

    React.useEffect(() => {
        loadRef.current = load;
        openRef.current = open;
    });

    // Polling (solo cuando el dropdown está cerrado)
    React.useEffect(() => {
        if (!enablePolling) return;
        pollIntervalRef.current = window.setInterval(() => {
            if (!open) load();
        }, POLL_INTERVAL);
        return () => {
            if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
        };
    }, [enablePolling, load, open]);

    // Carga inicial al abrir
    React.useEffect(() => {
        if (open) load(true);
    }, [open, load]);

    // Realtime (opcional) – requiere broadcasting (Reverb/Pusher) y canal 'broadcast' en Notifications
    React.useEffect(() => {
        if (!enableRealtime || !userId) return;

        const Echo = (window as any).Echo;
        if (!Echo || !Echo.private) return;

        const channelName = `App.Models.User.${userId}`;
        const ch = Echo.private(channelName);

        const handler = (notification: any) => {
            setPayload((prev) => {
                if (!prev) return prev;
                const unread_count = prev.unread_count + 1;

                // Usamos la ref para obtener el valor más reciente de 'open'
                if (openRef.current) {
                    // Usamos la ref para llamar a la función más reciente de 'load'
                    loadRef.current();
                }
                return { ...prev, unread_count };
            });
        };

        ch.notification(handler);

        return () => {
            try { ch.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated'); } catch { }
            try { Echo.leave(`private-${channelName}`); } catch { }
        };
    }, [enableRealtime, userId]); // <-- Dependencias correctas
    const unreadCount = payload?.unread_count ?? 0;

    const markAll = async () => {
        try {
            await axios.post(paths.markAll, {}, AXIOS_OPTS);
            await load();
            toast.success('Todas las notificaciones marcadas como leídas');
        } catch {
            toast.error('No se pudieron marcar las notificaciones');
        }
    };

    const markOne = async (id: string) => {
        setOptimistic((prev) => ({
            ...prev,
            markingAsRead: new Set([...prev.markingAsRead, id]),
        }));
        try {
            await axios.post(paths.markOne(id), {}, AXIOS_OPTS);
            await load();
        } catch {
            toast.error('No se pudo marcar la notificación');
        } finally {
            setOptimistic((prev) => {
                const next = new Set(prev.markingAsRead);
                next.delete(id);
                return { ...prev, markingAsRead: next };
            });
        }
    };

    const removeOne = async (id: string) => {
        setOptimistic((prev) => ({
            ...prev,
            removing: new Set([...prev.removing, id]),
        }));
        try {
            await axios.delete(paths.destroy(id), AXIOS_OPTS);
            await load(); // Recarga los datos para tener la fuente de verdad
        } catch {
            toast.error('No se pudo eliminar la notificación');
            // No es necesario limpiar aquí, el `finally` lo hará.
            // Si la petición falla, `load()` no se ejecuta y la recarga no ocurre,
            // así que el item volverá a aparecer con opacidad normal.
        } finally {
            // Esto se ejecuta siempre, con éxito o con error.
            setOptimistic((prev) => {
                const next = new Set(prev.removing);
                next.delete(id);
                return { ...prev, removing: next };
            });
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
        onNotificationClick?.(notification);
        if (!notification.read_at) markOne(notification.id);
    };

    const displayedUnread = (payload?.items.unread ?? [])
        .filter((n) => !optimistic.removing.has(n.id))
        .slice(0, maxNotifications);

    const displayedRead = (payload?.items.read ?? [])
        .filter((n) => !optimistic.removing.has(n.id))
        .slice(0, maxNotifications);

    const totalDisplayed = displayedUnread.length + displayedRead.length;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-xl hover:bg-primary/15 hover:text-primary transition-all duration-200 group hover:scale-110"
                >
                    <div className="absolute -inset-1 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    <Bell className="h-5 w-5 relative z-10 group-hover:animate-pulse" />
                    {unreadCount > 0 && (
                        <>
                            <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold leading-none animate-bounce bg-primary hover:bg-primary text-primary-foreground border-2 border-background shadow-lg min-w-[20px] h-5 flex items-center justify-center">
                                {formatUnreadCount(unreadCount)}
                            </Badge>
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary/30 rounded-full animate-ping"></div>
                        </>
                    )}
                    <span className="sr-only">
                        Notificaciones{unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 p-0 rounded-2xl border-2 border-border/50 shadow-2xl backdrop-blur-sm bg-background/95">
                <div className="relative bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10 px-4 py-3 border-b border-border/30">
                    <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail"></div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/20 rounded-lg p-1.5 border border-primary/30">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <DropdownMenuLabel className="p-0 text-lg font-bold">
                                Notificaciones
                                {error && (
                                    <span className="text-xs text-destructive ml-2 bg-destructive/10 px-2 py-1 rounded-md">
                                        {error}
                                    </span>
                                )}
                            </DropdownMenuLabel>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => load(true)}
                                disabled={loading}
                                className="h-8 px-3 rounded-lg hover:bg-primary/15 hover:text-primary transition-all duration-200"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAll}
                                disabled={unreadCount === 0 || loading}
                                className="h-8 px-3 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-200 disabled:opacity-50"
                            >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Todas</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <ScrollArea className="h-[380px] scrollbar-stoneretail">
                    <div className="p-3 space-y-2">
                        {displayedUnread.map((n) => (
                            <div
                                key={n.id}
                                className={`group relative rounded-xl border-2 border-amber-200/50 dark:border-amber-700/30 p-3 bg-gradient-to-r from-amber-50/80 to-primary/5 dark:from-amber-950/20 dark:to-primary/5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:scale-[1.02] ${optimistic.removing.has(n.id) ? 'opacity-50' : ''}`}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                <div className="relative flex items-start justify-between">
                                    <div className="pr-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                                {titleOf(n)}
                                            </div>
                                        </div>
                                        {messageOf(n) && (
                                            <div className="text-sm text-muted-foreground line-clamp-2 mb-2 group-hover:text-foreground/80 transition-colors">
                                                {messageOf(n)}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background/60 backdrop-blur-sm rounded-md px-2 py-1 w-fit">
                                            <Clock className="h-3 w-3" />
                                            {whenOf(n)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); markOne(n.id); }}
                                            disabled={optimistic.markingAsRead.has(n.id)}
                                            title="Marcar leída"
                                            className="h-7 w-7 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-200"
                                        >
                                            {optimistic.markingAsRead.has(n.id) ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <CheckCheck className="h-3 w-3" />
                                            )}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                                            disabled={optimistic.removing.has(n.id)}
                                            title="Eliminar"
                                            className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {displayedRead.map((n) => (
                            <div
                                key={n.id}
                                className={`group relative rounded-xl border border-border/30 p-3 bg-card/50 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 hover:bg-accent/20 ${optimistic.removing.has(n.id) ? 'opacity-50' : ''}`}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="pr-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Eye className="w-3 h-3 text-muted-foreground/60" />
                                            <div className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                                {titleOf(n)}
                                            </div>
                                        </div>
                                        {messageOf(n) && (
                                            <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                {messageOf(n)}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded-md px-2 py-1 w-fit">
                                            <Clock className="h-3 w-3" />
                                            {whenOf(n)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                                            disabled={optimistic.removing.has(n.id)}
                                            title="Eliminar"
                                            className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {totalDisplayed === 0 && !loading && (
                            <div className="text-center py-12">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 gradient-stoneretail-light rounded-full blur-xl opacity-40 animate-pulse"></div>
                                    <div className="relative bg-accent/30 rounded-2xl p-6 border border-border/30">
                                        <Bell className="w-12 h-12 text-primary/60 mx-auto" />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-lg text-foreground mb-2">
                                    {error ? 'Error de Conexión' : 'Todo al Día'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {error ? 'No se pudieron cargar las notificaciones' : 'No tienes notificaciones pendientes'}
                                </p>
                            </div>
                        )}

                        {loading && totalDisplayed === 0 && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse"></div>
                                    <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground mt-4">Cargando notificaciones...</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="relative border-t border-border/30 p-3 bg-gradient-to-r from-accent/10 to-background">
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                    <Button
                        variant="outline"
                        className="w-full rounded-xl border-2 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
                        onClick={() => {
                            setOpen(false);
                            router.visit(paths.index); // 👈 sin importar controllers PHP en el front
                        }}
                    >
                        <Eye className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                        Ver todas las notificaciones
                        {payload && (displayedUnread.length + displayedRead.length) < (payload.items.unread.length + payload.items.read.length) && (
                            <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
                                +{(payload.items.unread.length + payload.items.read.length) - (displayedUnread.length + displayedRead.length)}
                            </Badge>
                        )}
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
