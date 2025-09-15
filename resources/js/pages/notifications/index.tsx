/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    CheckCheck,
    Trash2,
    Bell,
    BellRing,
    Search,
    Filter,
    MoreVertical,
    Clock,
    AlertCircle,
    Info,
    CheckCircle,
    X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import axios from 'axios';

type NotificationItem = {
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
};

type NotificationPriority = 'high' | 'medium' | 'low';
type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsIndex() {
    const page = usePage<any>();
    const { notifications, unread_count } = page.props;

    // Estados locales
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState<FilterType>('all');
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = React.useState(false);

    const items: NotificationItem[] = notifications?.data ?? [];

    // Funciones auxiliares mejoradas
    const titleOf = (n: NotificationItem) =>
        n.data?.title ?? (n.type.split('\\').pop()?.replace(/([A-Z])/g, ' $1').trim() ?? 'Notificación');

    const messageOf = (n: NotificationItem) => n.data?.message ?? '';

    const whenOf = (n: NotificationItem) => {
        try {
            const date = new Date(n.created_at);
            const now = new Date();
            const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

            if (diffInMinutes < 1) return 'Ahora mismo';
            if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
            if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
            return date.toLocaleDateString();
        } catch {
            return '';
        }
    };

    const getPriorityFromType = (type: string): NotificationPriority => {
        if (type.toLowerCase().includes('error') || type.toLowerCase().includes('critical')) return 'high';
        if (type.toLowerCase().includes('warning') || type.toLowerCase().includes('alert')) return 'medium';
        return 'low';
    };

    const getNotificationIcon = (n: NotificationItem) => {
        const priority = getPriorityFromType(n.type);
        const iconClass = "h-4 w-4";

        switch (priority) {
            case 'high': return <AlertCircle className={`${iconClass} text-red-500`} />;
            case 'medium': return <Info className={`${iconClass} text-yellow-500`} />;
            default: return <CheckCircle className={`${iconClass} text-blue-500`} />;
        }
    };

    // Filtrado de notificaciones
    const filteredItems = React.useMemo(() => {
        let filtered = items;

        // Filtro por tipo
        if (filterType === 'unread') {
            filtered = filtered.filter(n => !n.read_at);
        } else if (filterType === 'read') {
            filtered = filtered.filter(n => n.read_at);
        }

        // Filtro por búsqueda
        if (searchTerm) {
            filtered = filtered.filter(n =>
                titleOf(n).toLowerCase().includes(searchTerm.toLowerCase()) ||
                messageOf(n).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [items, filterType, searchTerm]);

    // Funciones de acción mejoradas con loading states
    const performAction = async (action: () => Promise<void>) => {
        setIsLoading(true);
        try {
            await action();
            router.reload({ only: ['notifications', 'unread_count'] });
        } catch (error) {
            console.error('Error performing action:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAll = async () => {
        await performAction(async () => {
            await axios.post('/api/notifications/read-all', {}, { withCredentials: true });
        });
    };

    const markOne = async (id: string) => {
        await performAction(async () => {
            await axios.post(`/api/notifications/${id}/read`, {}, { withCredentials: true });
        });
    };

    const removeOne = async (id: string) => {
        await performAction(async () => {
            await axios.delete(`/api/notifications/${id}`, { withCredentials: true });
        });
    };

    const markSelected = async () => {
        await performAction(async () => {
            const promises = Array.from(selectedIds).map(id =>
                axios.post(`/api/notifications/${id}/read`, {}, { withCredentials: true })
            );
            await Promise.all(promises);
            setSelectedIds(new Set());
        });
    };

    const deleteSelected = async () => {
        await performAction(async () => {
            const promises = Array.from(selectedIds).map(id =>
                axios.delete(`/api/notifications/${id}`, { withCredentials: true })
            );
            await Promise.all(promises);
            setSelectedIds(new Set());
        });
    };

    // Manejo de selección
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredItems.map(n => n.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    return (
        <AppLayout>
            <Head title="Notificaciones" />
            <div className="p-6 max-w-6xl mx-auto">
                {/* Header mejorado */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            {unread_count > 0 ? (
                                <BellRing className="h-6 w-6 text-blue-600" />
                            ) : (
                                <Bell className="h-6 w-6 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {filteredItems.length} de {items.length} notificaciones
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant={unread_count > 0 ? 'destructive' : 'secondary'}
                            className="px-3 py-1"
                        >
                            {unread_count} sin leer
                        </Badge>
                        <Button
                            variant="outline"
                            onClick={markAll}
                            disabled={unread_count === 0 || isLoading}
                            className="min-w-[120px]"
                        >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Marcar todas
                        </Button>
                    </div>
                </div>

                {/* Barra de búsqueda y filtros */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar notificaciones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filtrar por..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="unread">Sin leer</SelectItem>
                            <SelectItem value="read">Leídas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Acciones de selección múltiple */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-4 border border-blue-200">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={markSelected}
                                disabled={isLoading}
                            >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                Marcar leídas
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={deleteSelected}
                                disabled={isLoading}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={clearSelection}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Selección masiva */}
                {filteredItems.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                        <Checkbox
                            checked={selectedIds.size === filteredItems.length}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    selectAll();
                                } else {
                                    clearSelection();
                                }
                            }}
                        />
                        <span className="text-sm text-gray-600">
                            Seleccionar todas las visibles
                        </span>
                    </div>
                )}

                {/* Lista de notificaciones mejorada */}
                <div className="space-y-3">
                    {filteredItems.map((n) => (
                        <div
                            key={n.id}
                            className={`
                                group border rounded-lg p-4 transition-all duration-200 hover:shadow-md
                                ${n.read_at ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200 shadow-sm'}
                                ${selectedIds.has(n.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={selectedIds.has(n.id)}
                                    onCheckedChange={() => toggleSelection(n.id)}
                                    className="mt-1"
                                />

                                <div className="flex-shrink-0 mt-1">
                                    {getNotificationIcon(n)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 text-sm">
                                                    {titleOf(n)}
                                                </h3>
                                                {!n.read_at && (
                                                    <Badge variant="default" className="text-xs px-2 py-0.5">
                                                        Nuevo
                                                    </Badge>
                                                )}
                                            </div>

                                            {messageOf(n) && (
                                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                    {messageOf(n)}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                <span>{whenOf(n)}</span>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {!n.read_at && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => markOne(n.id)}>
                                                            <CheckCheck className="h-4 w-4 mr-2" />
                                                            Marcar como leída
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                    </>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => removeOne(n.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {searchTerm || filterType !== 'all' ? 'No se encontraron notificaciones' : 'No hay notificaciones'}
                            </h3>
                            <p className="text-gray-600">
                                {searchTerm || filterType !== 'all'
                                    ? 'Prueba ajustando tus filtros de búsqueda'
                                    : 'Te notificaremos cuando tengas nuevas actualizaciones'
                                }
                            </p>
                            {(searchTerm || filterType !== 'all') && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterType('all');
                                    }}
                                    className="mt-4"
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Paginación mejorada */}
                {notifications?.links && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        {notifications.links.map((l: any, idx: number) => (
                            <Button
                                key={idx}
                                variant={l.active ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => l.url && router.visit(l.url)}
                                disabled={!l.url || isLoading}
                                dangerouslySetInnerHTML={{ __html: l.label }}
                                className={`min-w-[40px] ${l.active ? 'bg-blue-600' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}