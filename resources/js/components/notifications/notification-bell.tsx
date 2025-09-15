/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import axios, { AxiosError } from 'axios';
import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import NotificationController from '@/actions/App/Http/Controllers/Notifications/NotificationController';

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
    timeout: 10000 // 10 segundos de timeout
} as const;

const POLL_INTERVAL = 60000; // 1 minuto
const MAX_DISPLAY_COUNT = 99;

// Utility functions
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
}

export default function NotificationBell({
    enablePolling = false,
    maxNotifications = 20,
    onNotificationClick
}: NotificationBellProps = {}) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [payload, setPayload] = React.useState<DropdownPayload | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Optimistic updates state
    const [optimisticUpdates, setOptimisticUpdates] = React.useState<{
        markingAsRead: Set<string>;
        removing: Set<string>;
    }>({
        markingAsRead: new Set(),
        removing: new Set()
    });

    const load = React.useCallback(async (showToastOnError = false) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get<DropdownPayload>('/api/notifications', AXIOS_OPTS);
            setPayload(data);
        } catch (err) {
            const errorMessage = err instanceof AxiosError
                ? err.response?.data?.message || 'Error al cargar notificaciones'
                : 'Error de conexión';

            setError(errorMessage);

            if (showToastOnError) {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Polling effect
    React.useEffect(() => {
        if (enablePolling) {
            pollIntervalRef.current = setInterval(() => {
                if (!open) load(); // Solo actualizar si el dropdown está cerrado
            }, POLL_INTERVAL);

            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
            };
        }
    }, [enablePolling, load, open]);

    React.useEffect(() => {
        if (open) load(true);
    }, [open, load]);

    const unreadCount = payload?.unread_count ?? 0;

    const markAll = async () => {
        try {
            await axios.post('/api/notifications/read-all', {}, AXIOS_OPTS);
            await load();
            toast.success("Todas las notificaciones marcadas como leídas");
        } catch {
            toast.error("No se pudieron marcar las notificaciones");
        }
    };

    const markOne = async (id: string) => {
        // Optimistic update
        setOptimisticUpdates(prev => ({
            ...prev,
            markingAsRead: new Set([...prev.markingAsRead, id])
        }));

        try {
            await axios.post(`/api/notifications/${id}/read`, {}, AXIOS_OPTS);
            await load();
        } catch {
            toast.error("No se pudo marcar la notificación");
        } finally {
            setOptimisticUpdates(prev => ({
                ...prev,
                markingAsRead: new Set([...prev.markingAsRead].filter(item => item !== id))
            }));
        }
    };

    const removeOne = async (id: string) => {
        // Optimistic update
        setOptimisticUpdates(prev => ({
            ...prev,
            removing: new Set([...prev.removing, id])
        }));

        try {
            await axios.delete(`/api/notifications/${id}`, AXIOS_OPTS);
            await load();
        } catch {
            toast.error("No se pudo eliminar la notificación");
            // Revertir optimistic update
            setOptimisticUpdates(prev => ({
                ...prev,
                removing: new Set([...prev.removing].filter(item => item !== id))
            }));
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
        onNotificationClick?.(notification);
        if (!notification.read_at) {
            markOne(notification.id);
        }
    };

    const displayedUnread = (payload?.items.unread ?? [])
        .filter(n => !optimisticUpdates.removing.has(n.id))
        .slice(0, maxNotifications);

    const displayedRead = (payload?.items.read ?? [])
        .filter(n => !optimisticUpdates.removing.has(n.id))
        .slice(0, maxNotifications);

    const totalDisplayed = displayedUnread.length + displayedRead.length;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px] leading-none animate-pulse p-1"
                            variant="destructive"
                        >
                            {formatUnreadCount(unreadCount)}
                        </Badge>
                    )}
                    <span className="sr-only">
                        Notificaciones{unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between px-3 py-2">
                    <DropdownMenuLabel className="p-0">
                        Notificaciones
                        {error && <span className="text-xs text-destructive ml-2">({error})</span>}
                    </DropdownMenuLabel>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => load(true)}
                            disabled={loading}
                            className="h-8"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAll}
                            disabled={unreadCount === 0 || loading}
                            className="h-8"
                        >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Marcar todas leídas
                        </Button>
                    </div>
                </div>
                <DropdownMenuSeparator />

                <ScrollArea className="h-[360px]">
                    <div className="px-2 py-2 space-y-2">
                        {/* Unread notifications */}
                        {displayedUnread.map((n) => (
                            <div
                                key={n.id}
                                className={`rounded-md border p-2 bg-amber-50 dark:bg-amber-950/30 cursor-pointer transition-all hover:bg-amber-100 dark:hover:bg-amber-950/50 ${optimisticUpdates.removing.has(n.id) ? 'opacity-50' : ''
                                    }`}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="pr-2 flex-1">
                                        <div className="font-medium text-sm">{titleOf(n)}</div>
                                        {messageOf(n) && (
                                            <div className="text-sm text-muted-foreground line-clamp-2">
                                                {messageOf(n)}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {whenOf(n)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markOne(n.id);
                                            }}
                                            disabled={optimisticUpdates.markingAsRead.has(n.id)}
                                            title="Marcar leída"
                                            className="h-6 w-6"
                                        >
                                            {optimisticUpdates.markingAsRead.has(n.id) ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <CheckCheck className="h-3 w-3" />
                                            )}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOne(n.id);
                                            }}
                                            disabled={optimisticUpdates.removing.has(n.id)}
                                            title="Eliminar"
                                            className="h-6 w-6"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Read notifications */}
                        {displayedRead.map((n) => (
                            <div
                                key={n.id}
                                className={`rounded-md border p-2 cursor-pointer transition-all hover:bg-muted/50 ${optimisticUpdates.removing.has(n.id) ? 'opacity-50' : ''
                                    }`}
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="pr-2 flex-1">
                                        <div className="font-medium text-sm text-muted-foreground">
                                            {titleOf(n)}
                                        </div>
                                        {messageOf(n) && (
                                            <div className="text-sm text-muted-foreground line-clamp-2">
                                                {messageOf(n)}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {whenOf(n)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOne(n.id);
                                            }}
                                            disabled={optimisticUpdates.removing.has(n.id)}
                                            title="Eliminar"
                                            className="h-6 w-6"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {totalDisplayed === 0 && !loading && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                {error ? 'Error al cargar notificaciones' : 'Sin notificaciones'}
                            </div>
                        )}

                        {loading && totalDisplayed === 0 && (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DropdownMenuSeparator />
                <div className="p-2">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            setOpen(false);
                            router.visit(NotificationController.index.url());
                        }}
                    >
                        Ver todas
                        {payload && (displayedUnread.length + displayedRead.length) > totalDisplayed && (
                            <span className="ml-1 text-xs">
                                ({(payload.items.unread.length + payload.items.read.length) - totalDisplayed} más)
                            </span>
                        )}
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}