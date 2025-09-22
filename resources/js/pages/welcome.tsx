/* eslint-disable @typescript-eslint/no-unused-vars */
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Box, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Componente para el Logo
const Logo = () => (
    <div className="flex items-center gap-2">
        <Box className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
            StoneRetail
        </span>
    </div>
);

// Componente para la Navegación
const AuthNav = ({ user }: { user: SharedData['auth']['user'] }) => (
    <nav className="flex items-center gap-2">
        {user ? (
            <Button asChild>
                <Link href={dashboard()}>Dashboard</Link>
            </Button>
        ) : (
            <>
                <Button asChild variant="ghost">
                    <Link href={login()}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Iniciar Sesión
                    </Link>
                </Button>
                {/* <Button asChild>
                    <Link href={register()}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Registrarse
                    </Link>
                </Button> */}
            </>
        )}
    </nav>
);

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    // Configuración para la animación en cascada
    const FADE_IN_ANIMATION_VARIANTS = {
        hidden: { opacity: 0, y: -10 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const } },
    };

    return (
        <>
            <Head title="Bienvenido a StoneRetail" />
            <div className="flex min-h-screen flex-col bg-background text-slate-800  dark:text-slate-200">
                {/* Header */}
                <motion.header
                    initial="hidden"
                    animate="show"
                    transition={{ delayChildren: 0.2, staggerChildren: 0.1 }}
                    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 px-8 bg-background backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
                >
                    <motion.div variants={FADE_IN_ANIMATION_VARIANTS}>
                        <Logo />
                    </motion.div>
                    <motion.div variants={FADE_IN_ANIMATION_VARIANTS}>
                        <AuthNav user={auth.user} />
                    </motion.div>
                </motion.header>

                {/* Contenido Principal (Hero Section) */}
                <main className="flex flex-1 items-center justify-center">
                    <motion.div
                        initial="hidden"
                        animate="show"
                        transition={{ delayChildren: 0.4, staggerChildren: 0.15 }}
                        className="text-center space-y-6"
                    >
                        <motion.h1
                            variants={FADE_IN_ANIMATION_VARIANTS}
                            className="text-5xl md:text-7xl font-extrabold tracking-tighter"
                        >
                            <span className="bg-gradient-to-r from-stoneretail-primary-dark to-stoneretail-primary-light bg-clip-text text-transparent">
                                StoneRetail
                            </span>
                            : Tu Negocio, en Control.
                        </motion.h1>

                        <motion.p
                            variants={FADE_IN_ANIMATION_VARIANTS}
                            className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400"
                        >
                            La solución de Punto de Venta (POS) e inventario diseñada para la agilidad.
                            Simplifica tus ventas, gestiona tu stock y entiende tus finanzas sin esfuerzo.
                        </motion.p>

                        <motion.div variants={FADE_IN_ANIMATION_VARIANTS}>
                            <Button asChild size="lg" className="text-base font-bold">
                                {auth.user ? <Link href={dashboard()}>Ir al Dashboard</Link> : <Link href={login()}>Comenzar Ahora</Link>}
                            </Button>
                        </motion.div>
                    </motion.div>
                </main>

                {/* Footer */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="py-4 text-center text-sm text-slate-500"
                >
                    © {new Date().getFullYear()} ModernPos. Todos los derechos reservados.
                </motion.footer>
            </div>
        </>
    );
}