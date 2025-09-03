import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { User, Role, Store } from '@/types';
import UserForm from './partials/user-form';

interface Props {
    user: User;
    roles: Role[];
    stores: Store[];
}

export default function Edit({ user, roles, stores }: Props) {
    return (
        <AppLayout>
            <Head title={`Editar Usuario: ${user.name}`} />
            <div className="py-12 max-w-4xl mx-auto">
                <h1 className="text-2xl font-semibold mb-6">Editar Usuario</h1>
                <UserForm user={user} roles={roles} stores={stores} />
            </div>
        </AppLayout>
    );
}
