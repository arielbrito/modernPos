/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { type User, type Role, type Store } from '@/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';

type UserWithRels = User & {
    roles?: Array<Pick<Role, 'id' | 'name'>>;
    stores?: Array<Pick<Store, 'id' | 'name'>>;
};

interface UserFormProps {
    user?: UserWithRels;   // <— usa este tipo aquí
    roles: Role[];
    stores: Store[];
}
type UserPayload = {
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    role_id: number | '';   // controlamos string en UI, casteamos al enviar
    store_ids: number[];
};

export default function UserForm({ user, roles, stores }: UserFormProps) {
    const isEditing = !!user;

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset,
        clearErrors,
        transform,
    } = useForm<UserPayload>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role_id: user?.roles?.[0]?.id ?? '',
        store_ids: user?.stores?.map((s: { id: any; }) => s.id) ?? [],
    });

    // Mantén el form sincronizado cuando cambia el usuario a editar
    useEffect(() => {
        reset({
            name: user?.name ?? '',
            email: user?.email ?? '',
            password: '',
            password_confirmation: '',
            role_id: user?.roles?.[0]?.id ?? '',
            store_ids: user?.stores?.map(s => s.id) ?? [],
        });
        clearErrors();
    }, [user]);

    // Casteos/omitir campos antes de enviar
    transform((payload) => {
        const out: any = { ...payload };
        out.role_id = out.role_id === '' ? '' : Number(out.role_id);
        out.store_ids = Array.isArray(out.store_ids) ? out.store_ids.map((id: any) => Number(id)) : [];
        if (isEditing && !out.password) {
            delete out.password;
            delete out.password_confirmation;
        }
        return out;
    });

    const handleStoreToggle = (storeId: number) => {
        setData('store_ids',
            data.store_ids.includes(storeId)
                ? data.store_ids.filter(id => id !== storeId)
                : [...data.store_ids, storeId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && user) {
            put(UserController.update.url({ user: user.id }), { preserveScroll: true });
        } else {
            post(UserController.store.url(), { preserveScroll: true });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            value={data.password ?? ''}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder={isEditing ? 'Dejar en blanco para no cambiar' : ''}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={data.password_confirmation ?? ''}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Rol y Tiendas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Rol del Usuario</Label>
                        <Select
                            value={String(data.role_id)}
                            onValueChange={(v) => setData('role_id', v === '' ? '' : Number(v))}
                        >
                            <SelectTrigger><SelectValue placeholder="Seleccionar un rol..." /></SelectTrigger>
                            <SelectContent>
                                {roles.map(role => (
                                    <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.role_id} className="mt-2" />
                    </div>

                    <div>
                        <Label>Tiendas Asignadas</Label>
                        <div className="space-y-2 mt-2 p-4 border rounded-md max-h-56 overflow-y-auto">
                            {stores.map(store => (
                                <div key={store.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`store_${store.id}`}
                                        checked={data.store_ids.includes(store.id)}
                                        onCheckedChange={() => handleStoreToggle(store.id)}
                                    />
                                    <Label htmlFor={`store_${store.id}`}>{store.name}</Label>
                                </div>
                            ))}
                        </div>
                        <InputError message={errors.store_ids} className="mt-2" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button type="submit" disabled={processing}>
                    {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                </Button>
            </div>
        </form>
    );
}
