
import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { CartItem } from '@/types';

/**
 * Define un tipo más claro para el evento 'before' de Inertia.
 * Esto hace que el código sea más legible y seguro.
 */
type InertiaBeforeNavigateEvent = {
    detail: {
        visit: {
            url: URL; // El objeto URL tiene la propiedad 'pathname'
        };
    };
    preventDefault: () => void;
};

/**
 * Hook para prevenir la salida accidental de la página de POS si hay una venta en curso.
 * @param cartItems - El array de items en el carrito.
 */
function usePosExitGuard(cartItems: CartItem[]) { // <-- CORRECCIÓN 1: Debe ser un array de CartItem[]
    const isSubmitting = useRef(false);

    const allowNavigation = () => {
        isSubmitting.current = true;
    };

    useEffect(() => {
        // --- Guard 1: Para cerrar la pestaña/navegador ---
        const onBeforeUnload = (e: BeforeUnloadEvent) => { // <-- MEJORA 2: Usar el tipo nativo del evento
            if (cartItems.length > 0 && !isSubmitting.current) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        // --- Guard 2: Para navegación DENTRO de la aplicación ---
        const handleBeforeNavigate = (event: InertiaBeforeNavigateEvent) => { // <-- MEJORA 3: Usar el tipo definido
            const destinationUrl = event.detail.visit.url.pathname;
            const currentUrl = window.location.pathname;

            if (
                cartItems.length > 0 &&
                !isSubmitting.current &&
                destinationUrl !== currentUrl
            ) {
                if (!window.confirm('Tienes una venta en progreso. ¿Estás seguro de que quieres salir?')) {
                    event.preventDefault();
                }
            }
        };

        // --- Configuración y Limpieza de Eventos ---
        window.addEventListener('beforeunload', onBeforeUnload);
        // El listener de Inertia necesita un casting porque la librería no exporta el tipo de evento directamente.
        const removeInertiaListener = router.on('before', handleBeforeNavigate as unknown as (event: Event) => void);

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            removeInertiaListener();
        };
    }, [cartItems.length]); // La dependencia es correcta.

    return { allowNavigation };
}

export default usePosExitGuard;
