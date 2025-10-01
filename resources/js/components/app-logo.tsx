import AppLogoIcon from './app-logo-icon';
import { usePage } from '@inertiajs/react';
import { Store } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AppLogo() {
    const { active_store } = usePage().props as {
        active_store?: {
            id: number;
            name: string;
            code?: string;
            logo_url?: string
        } | null
    };

    const storeName = active_store?.name ?? 'StoneRetail';
    const storeCode = active_store?.code;
    const logoUrl = active_store?.logo_url;

    return (
        <div className="flex items-center gap-3 group">
            {/* Contenedor del logo con efectos */}
            <motion.div
                className="relative flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Logo personalizado de la tienda o icono por defecto */}
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt={storeName}
                        className="w-full h-full object-cover rounded-xl"
                    />
                ) : (
                    <AppLogoIcon className="relative size-6 fill-current text-white drop-shadow-sm" />
                )}

                {/* Indicador de tienda activa */}
                <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>

            {/* Información de la tienda */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold leading-tight text-sidebar-foreground group-hover:text-primary transition-colors duration-200">
                        {storeName}
                    </span>
                    {storeCode && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {storeCode}
                        </span>
                    )}
                </div>

                {/* Indicador de estado */}
                <div className="flex items-center gap-1.5 mt-0.5">
                    <Store className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                        {active_store ? 'Tienda Activa' : 'Sistema Principal'}
                    </span>
                </div>
            </div>
        </div>
    );
}