import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Role, Store } from '@/types';
import UserForm from './partials/user-form';

interface Props {
    roles: Role[];
    stores: Store[];
}

export default function Create({ roles, stores }: Props) {
    return (
        <AppLayout>
            <Head title="Crear Usuario" />
            <div className="py-12 max-w-4xl mx-auto">
                <h1 className="text-2xl font-semibold mb-6">Crear Nuevo Usuario</h1>
                <UserForm roles={roles} stores={stores} />
            </div>
        </AppLayout>
    );
}
