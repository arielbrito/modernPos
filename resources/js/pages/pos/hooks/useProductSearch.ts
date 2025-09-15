import PosController from '@/actions/App/Http/Controllers/POS/PosController';
import type { Product } from '@/types';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UseProductSearchResult {
    query: string;
    setQuery: (query: string) => void;
    results: Product[];
    isLoading: boolean;
}

/**
 * Hook para gestionar la búsqueda de productos en el TPV.
 * Incluye carga inicial de productos destacados y búsqueda con debounce.
 * @param {number} debounceMs - Milisegundos para el debounce de la búsqueda.
 */
export function useProductSearch(debounceMs: number = 300): UseProductSearchResult {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Inicia en true para la carga inicial

    // Efecto para la carga inicial de productos destacados.
    // Se ejecuta una sola vez cuando el componente se monta.
    useEffect(() => {
        const fetchInitialProducts = async () => {
            setIsLoading(true);
            try {
                const { data } = await axios.get(PosController.searchProducts.url(), { params: { limit: 12 } });
                setResults(data);
            } catch (error) {
                console.error('Failed to load initial products:', error);
                toast.error('No se pudieron cargar los productos iniciales.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialProducts();
    }, []); // El array vacío asegura que se ejecute solo una vez.

    // Efecto para la búsqueda con debounce cuando el `query` cambia.
    useEffect(() => {
        // Si la búsqueda está vacía, no hacemos nada.
        // Los productos iniciales permanecerán visibles.
        if (query.trim() === '') {
            // Si prefieres que la lista se limpie al borrar la búsqueda,
            // puedes descomentar la siguiente línea:
            // setResults([]);
            return;
        }

        const timer = setTimeout(() => {
            const fetchSearchResults = async () => {
                setIsLoading(true);
                try {
                    const { data } = await axios.get(PosController.searchProducts.url(), { params: { term: query } });
                    setResults(data);
                } catch (error) {
                    console.error('Error searching for products:', error);
                    toast.error('Error al buscar productos.');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchSearchResults();
        }, debounceMs);

        // Limpieza: se ejecuta si el `query` cambia antes de que pase el tiempo
        // del debounce, o cuando el componente se desmonta.
        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    return { query, setQuery, results, isLoading };
}
