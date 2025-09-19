import { useEffect, useState } from 'react';

/**
 * Hook personalizado para retrasar la actualización de un valor (debounce).
 * Útil para evitar peticiones a la red en cada pulsación de tecla.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Limpia el temporizador si el valor cambia o el componente se desmonta
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
