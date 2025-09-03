import { Head, useForm, router } from '@inertiajs/react';
import { Store } from '@/types'; // Asegúrate de tener este tipo definido
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StoreSessionController from './../../actions/App/Http/Controllers/Auth/StoreSessionController';

interface Props {
    stores: Store[];
}

export default function SelectStore({ stores }: Props) {
    const { processing, errors } = useForm<{ store_id: number | null }>({ store_id: null });



    const handleSelect = (storeId: number) => {
        router.post(
            StoreSessionController.store['/select-store'].url(), // 👈 nota el .store
            { store_id: storeId },
            { preserveScroll: true }
        );
    };

    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100 dark:bg-gray-900">
            <Head title="Seleccionar Tienda" />
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>Selecciona una Tienda</CardTitle>
                    <CardDescription>Elige la tienda en la que quieres trabajar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stores.map(store => (
                        <Button
                            key={store.id}
                            variant="outline"
                            className="w-full h-16 flex justify-start items-center gap-4"
                            onClick={() => handleSelect(store.id)}
                            disabled={processing}
                        >
                            <img
                                src={store.logo_url || 'https://via.placeholder.com/40'} // Necesitarás un accesor 'logo_url' en el modelo Store
                                alt={store.name}
                                className="h-10 w-10 object-cover rounded-md"
                            />
                            <div>
                                <div className="font-bold text-left">{store.name}</div>
                                <div className="text-xs text-muted-foreground text-left">{store.code}</div>
                            </div>
                        </Button>
                    ))}
                    <p>{errors.store_id}</p>
                </CardContent>
            </Card>
        </div>
    );
}