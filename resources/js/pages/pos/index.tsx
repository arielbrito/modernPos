/* eslint-disable @typescript-eslint/no-unused-vars */
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { User, Product } from '@/types';
import { useState, useEffect } from 'react'; // Importar hooks
import { Input } from '@/components/ui/input'; // Importar componente de input
import axios from 'axios'; // Usaremos axios para las peticiones
import PosController from '@/actions/App/Http/Controllers/POS/PosController'
import { Button } from '@/components/ui/button'; // Importar Button
import { Trash2 } from 'lucide-react';
import { PaymentDialog } from './partials/paymentDialog';

interface IndexProps {
    auth: { user: User };
}

type CartItem = {
    product_variant_id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
};

export default function Index({ auth }: IndexProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Dentro del componente Index

    const { post: processSale, processing: isProcessingSale } = useForm({
        cart_items: [] as CartItem[],
        payment_method: 'cash',
        total: 0,
    });

    const handleProcessSale = (paymentMethod: string) => {
        processSale(('pos.storeSale'), {
            data: {
                cart_items: cartItems,
                payment_method: paymentMethod,
                total: totals.total,
            },
            onSuccess: () => {
                // Si la venta es exitosa, limpiamos el carrito y cerramos el modal
                setCartItems([]);
                setIsPaymentModalOpen(false);
            },
            preserveState: true,
        });
    };


    const addToCart = (product: Product) => {
        // Por ahora, asumimos que siempre añadimos la primera variante
        const variant = product.variants[0];
        if (!variant) return; // No hacer nada si no hay variante

        setCartItems(prevItems => {
            // Busca si la variante ya está en el carrito
            const existingItem = prevItems.find(item => item.product_variant_id === variant.id);

            if (existingItem) {
                // Si existe, actualiza la cantidad
                return prevItems.map(item =>
                    item.product_variant_id === variant.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // Si no existe, añádelo a la lista
                const newItem: CartItem = {
                    product_variant_id: variant.id,
                    name: product.name,
                    sku: variant.sku,
                    quantity: 1,
                    price: parseFloat(variant.selling_price),
                };
                return [...prevItems, newItem];
            }
        });

        // Limpia la búsqueda para una nueva selección
        setSearchQuery('');
        setSearchResults([]);
    };

    // ...

    useEffect(() => {
        // Si no hay texto, no hacer nada
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        // Configura un temporizador
        const delayDebounceFn = setTimeout(() => {
            // Llama a la API de Laravel
            axios.get(PosController.searchProducts.url(), {
                // --- LÍNEA CORREGIDA ---
                // Aquí le pasamos el término de búsqueda al backend
                params: { term: searchQuery }
            })
                .then(response => {
                    setSearchResults(response.data);
                })
                .catch(error => console.error("Error buscando productos:", error))
                .finally(() => setIsLoading(false));
        }, 300); // Espera 300ms después de la última pulsación

        // Limpia el temporizador si el usuario sigue escribiendo
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);


    // --- NUEVO ESTADO PARA LOS TOTALES ---
    const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });

    // --- EFECTO PARA RECALCULAR TOTALES CUANDO EL CARRITO CAMBIA ---
    useEffect(() => {
        const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        // Lógica de impuestos (por ahora 0)
        const tax = 0;
        const total = subtotal + tax;

        setTotals({ subtotal, tax, total });
    }, [cartItems]); // Se ejecuta cada vez que 'cartItems' cambia

    const updateCartQuantity = (product_variant_id: number, newQuantity: number) => {
        setCartItems(prevItems => {
            // Si la nueva cantidad es 0 o menos, eliminamos el item
            if (newQuantity <= 0) {
                return prevItems.filter(item => item.product_variant_id !== product_variant_id);
            }

            // Si no, actualizamos la cantidad del item correspondiente
            return prevItems.map(item =>
                item.product_variant_id === product_variant_id
                    ? { ...item, quantity: newQuantity }
                    : item
            );
        });
    };

    return (
        <AppLayout >
            <Head title="Punto de Venta" />

            <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-theme(space.16))]"> {/* Ajuste de altura */}
                {/* Columna Izquierda y Central */}
                <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
                    <div className="p-4 border-b">
                        <Input
                            type="text"
                            placeholder="Buscar producto por nombre, SKU o código de barras..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-lg"
                        />
                    </div>

                    {/* --- ÁREA DE RESULTADOS DE BÚSQUEDA --- */}
                    <div className="p-4 flex-grow overflow-y-auto">
                        {isLoading && <p>Buscando...</p>}

                        {!isLoading && searchResults.length > 0 && (
                            <ul className="space-y-2">
                                {searchResults.map(product => (
                                    <li
                                        key={product.id}
                                        className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        onClick={() => addToCart(product)}
                                    >
                                        <p className="font-semibold">{product.name}</p>
                                        <p className="text-sm text-gray-500">
                                            SKU: {product.variants[0]?.sku} - Precio: ${product.variants[0]?.selling_price}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!isLoading && searchQuery && searchResults.length === 0 && (
                            <p>No se encontraron productos.</p>
                        )}
                    </div>



                    {/* ... después del div de resultados de búsqueda ... */}
                    <div className="border-t p-4">
                        <h3 className="text-lg font-semibold mb-2">Carrito</h3>
                        <ul className="space-y-3">
                            {cartItems.map(item => (
                                <li key={item.product_variant_id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold w-20 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                                        <div className="flex items-center border rounded-md">
                                            {/* Botón de disminuir */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => updateCartQuantity(item.product_variant_id, item.quantity - 1)}
                                            >
                                                -
                                            </Button>
                                            <span className="px-3">{item.quantity}</span>
                                            {/* Botón de aumentar */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => updateCartQuantity(item.product_variant_id, item.quantity + 1)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                        {/* Botón de eliminar */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-400"
                                            onClick={() => updateCartQuantity(item.product_variant_id, 0)} // Poner cantidad a 0 para eliminar
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                            {cartItems.length === 0 && (
                                <p className="text-center text-gray-400 py-4">El carrito está vacío</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Columna Derecha */}
                <div className="col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col justify-between">
                    <div className="p-4">
                        <h2 className="text-xl font-semibold mb-4">Total</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>${totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Impuestos</span>
                                <span>${totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-bold mt-4 pt-4 border-t">
                                <span>Total</span>
                                <span>${totals.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <Button onClick={() => setIsPaymentModalOpen(true)} disabled={cartItems.length === 0} className="w-full text-lg h-12">
                            Pagar
                        </Button>
                    </div>
                </div>
            </div>
            <PaymentDialog
                isOpen={isPaymentModalOpen}
                setIsOpen={setIsPaymentModalOpen}
                cartItems={cartItems}
                total={totals.total}
                onSubmit={handleProcessSale}
                isProcessing={isProcessingSale}
            />
        </AppLayout>
    );
}