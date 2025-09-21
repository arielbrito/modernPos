// Marca este archivo como módulo para habilitar "declare global"
export {};

declare global {
    interface Window {
        /**
         * Inyectado por Laravel Wayfinder (si está habilitado en el front).
         * Genera la URL a partir del nombre de ruta.
         */
        route?: (name: string, params?: Record<string, string | number>) => string;
    }
}
