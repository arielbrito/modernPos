import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export type UserFilters = {
    q: string;
    role_id: string;   // id como string o 'all'
    store_id: string;  // id como string o 'all'
    verified: 'all' | 'yes' | 'no';
    sort: 'created_at' | 'name' | 'email';
    dir: 'asc' | 'desc';
    per_page: number;  // 10 | 25 | 50 | 100
};

type RoleOption = { id: number; name: string };
type StoreOption = { id: number; name: string };

function useDebounce<T>(value: T, delay = 300) {
    const [v, setV] = React.useState(value);
    React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}

export default function UserFilter({
    value,
    onChange,
    roles,
    stores,
    defaults,
}: {
    value: UserFilters;
    onChange: (next: UserFilters) => void;
    roles: RoleOption[];
    stores: StoreOption[];
    defaults?: UserFilters; // opcional, si no viene uso los del value inicial
}) {
    // estado local para el search con debounce
    const [q, setQ] = React.useState(value.q ?? '');
    const dq = useDebounce(q, 350);

    // cuando el parent cambie (p.ej. navegación/paginación), sincronizamos
    React.useEffect(() => { setQ(value.q ?? ''); }, [value.q]);

    // disparamos onChange solo cuando cambia el debounced search
    React.useEffect(() => {
        if (dq !== value.q) onChange({ ...value, q: dq });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dq]);

    const reset = () => {
        const base = defaults ?? {
            q: '',
            role_id: 'all',
            store_id: 'all',
            verified: 'all',
            sort: 'created_at',
            dir: 'desc',
            per_page: 10,
        };
        setQ(base.q);
        onChange(base);
    };

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                {/* Buscar */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar por nombre o email"
                        className="pl-10"
                    />
                </div>

                {/* Rol */}
                <Select value={value.role_id} onValueChange={(v) => onChange({ ...value, role_id: v })}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Rol" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los roles</SelectItem>
                        {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                {/* Tienda */}
                <Select value={value.store_id} onValueChange={(v) => onChange({ ...value, store_id: v })}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Tienda" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las tiendas</SelectItem>
                        {stores.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                {/* Verificado */}
                <Select value={value.verified} onValueChange={(v: 'all' | 'yes' | 'no') => onChange({ ...value, verified: v })}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Estado email" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="yes">Verificados</SelectItem>
                        <SelectItem value="no">Sin verificar</SelectItem>
                    </SelectContent>
                </Select>

                {/* Orden */}
                <Select value={value.sort} onValueChange={(v: 'created_at' | 'name' | 'email') => onChange({ ...value, sort: v })}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Fecha de alta</SelectItem>
                        <SelectItem value="name">Nombre</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={value.dir} onValueChange={(v: 'asc' | 'desc') => onChange({ ...value, dir: v })}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Dirección" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="asc">Asc</SelectItem>
                        <SelectItem value="desc">Desc</SelectItem>
                    </SelectContent>
                </Select>

                {/* Tamaño página */}
                <Select value={String(value.per_page)} onValueChange={(v) => onChange({ ...value, per_page: Number(v) })}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Por pág." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Limpiar</Button>
            </div>
        </div>
    );
}
