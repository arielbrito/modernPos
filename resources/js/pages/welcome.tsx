/* eslint-disable @typescript-eslint/no-unused-vars */
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
    Box,
    LogIn,
    Share,
    UserPlus,
    ChevronRight,
    Sparkles,
    Zap,
    Shield,
    TrendingUp,
    BarChart3,
    Package,
    Star,
    ArrowRight,
    Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

// Partículas flotantes animadas
const FloatingParticle = ({ delay = 0, duration = 4, x = 0, y = 0 }) => (
    <motion.div
        className="absolute w-2 h-2 bg-primary/20 rounded-full blur-sm"
        animate={{
            y: [y, y - 100, y],
            x: [x, x + 20, x - 20, x],
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    />
);

// Componente mejorado para el Logo con efectos
const Logo = () => (
    <motion.div
        className="flex items-center gap-3 relative group"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400 }}
    >
        <motion.div
            className="relative p-2 bg-primary/10 rounded-xl border border-primary/20"
            whileHover={{
                rotate: 360,
                background: "linear-gradient(135deg, var(--color-primary), var(--color-stoneretail-primary-light))"
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
        >
            <Box className="h-6 w-6 text-primary group-hover:text-white transition-colors duration-300" />
            <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            StoneRetail
        </span>

        <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
        />
    </motion.div>
);

// Componente mejorado para la Navegación
const AuthNav = ({ user }: { user: SharedData['auth']['user'] | null | undefined }) => (
    <nav className="flex items-center gap-3">
        {user ? (
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 relative overflow-hidden group"
                >
                    <Link href={dashboard()} className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Dashboard ({user.name})
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </Link>
                </Button>
            </motion.div>
        ) : (
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    asChild
                    variant="default"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 relative overflow-hidden group"
                >
                    <Link href={login()} className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Iniciar Sesión
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </Link>
                </Button>
            </motion.div>
        )}
    </nav>
);

// Componente de características destacadas
const FeatureCard = ({ icon, title, description, delay }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
            delay,
            type: "spring" as const,
            stiffness: 200,
            damping: 20
        }}
        whileHover={{
            scale: 1.05,
            rotateY: 5,
            z: 50
        }}
        className="group relative p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

        <div className="relative">
            <motion.div
                className="w-12 h-12 bg-primary/15 rounded-xl border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                whileHover={{ rotate: 10 }}
            >
                {icon}
            </motion.div>

            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {title}
            </h3>
            <p className="text-muted-foreground text-sm mt-2 group-hover:text-foreground/80 transition-colors duration-300">
                {description}
            </p>
        </div>
    </motion.div>
);

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 300], [0, -50]);
    const y2 = useTransform(scrollY, [0, 300], [0, -100]);

    // Seguimiento del mouse para efectos parallax
    useEffect(() => {
        const updateMousePosition = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', updateMousePosition);
        return () => window.removeEventListener('mousemove', updateMousePosition);
    }, []);

    // Configuración de animaciones mejoradas
    const HERO_ANIMATION_VARIANTS = {
        hidden: { opacity: 0, y: 100, scale: 0.8 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 150,
                damping: 20,
                mass: 1
            }
        },
    };

    const STAGGER_CONTAINER = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                delayChildren: 0.6,
                staggerChildren: 0.2
            }
        }
    };

    const FADE_UP_VARIANTS = {
        hidden: { opacity: 0, y: 50 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 200,
                damping: 25
            }
        },
    };

    return (
        <>
            <Head title="Bienvenido a StoneRetail" />
            <div className="flex min-h-screen flex-col bg-background text-foreground relative overflow-hidden">

                {/* Fondo animado con gradientes */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10"></div>

                {/* Partículas flotantes */}
                {Array.from({ length: 15 }, (_, i) => (
                    <FloatingParticle
                        key={i}
                        delay={i * 0.5}
                        duration={4 + (i % 3)}
                        x={Math.random() * window.innerWidth}
                        y={Math.random() * window.innerHeight}
                    />
                ))}

                {/* Efecto de cursor personalizado */}
                <motion.div
                    className="fixed top-0 left-0 w-6 h-6 bg-primary/20 rounded-full pointer-events-none z-50 blur-sm"
                    animate={{
                        x: mousePosition.x - 12,
                        y: mousePosition.y - 12,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />

                {/* Header mejorado */}
                <motion.header
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
                    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 px-8 bg-background/80 backdrop-blur-xl border-b border-border/30 shadow-lg"
                >
                    <Logo />
                    <AuthNav user={auth?.user} />
                </motion.header>

                {/* Contenido Principal (Hero Section) */}
                <main className="flex flex-1 items-center justify-center relative px-4 pt-20">
                    <motion.div
                        style={{ y: y1 }}
                        initial="hidden"
                        animate="show"
                        variants={STAGGER_CONTAINER}
                        className="text-center space-y-8 max-w-6xl mx-auto"
                    >
                        {/* Título principal con efectos avanzados */}
                        <motion.div variants={HERO_ANIMATION_VARIANTS} className="relative">
                            <motion.h1
                                className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none"
                                animate={{
                                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                style={{
                                    backgroundImage: "linear-gradient(90deg, var(--color-primary), var(--color-stoneretail-primary-light), var(--color-primary))",
                                    backgroundSize: "200% 100%",
                                    backgroundClip: "text",
                                    WebkitBackgroundClip: "text",
                                    color: "transparent"
                                }}
                            >
                                StoneRetail
                            </motion.h1>

                            <motion.div
                                className="absolute -inset-4 bg-primary/10 rounded-3xl blur-3xl"
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.3, 0.6, 0.3]
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />

                            <motion.h2
                                variants={FADE_UP_VARIANTS}
                                className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mt-4"
                            >
                                Tu Negocio,{" "}
                                <span className="relative">
                                    en Control
                                    <motion.div
                                        className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 2, duration: 1 }}
                                    />
                                </span>
                            </motion.h2>
                        </motion.div>

                        {/* Descripción mejorada */}
                        <motion.p
                            variants={FADE_UP_VARIANTS}
                            className="max-w-3xl mx-auto text-xl md:text-2xl text-muted-foreground leading-relaxed"
                        >
                            La solución de{" "}
                            <motion.span
                                className="font-bold text-primary"
                                whileHover={{ scale: 1.1 }}
                            >
                                Punto de Venta (POS)
                            </motion.span>
                            {" "}e inventario diseñada para la agilidad moderna.
                            <br />
                            Simplifica tus ventas, gestiona tu stock y domina tus finanzas.
                        </motion.p>

                        {/* CTA Button mejorado */}
                        <motion.div variants={FADE_UP_VARIANTS} className="pt-4">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    asChild
                                    size="lg"
                                    className="text-xl font-bold px-12 py-6 h-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl hover:shadow-primary/30 relative overflow-hidden group rounded-2xl"
                                >
                                    <Link href={auth?.user ? dashboard() : login()} className="flex items-center gap-3">
                                        <Rocket className="w-6 h-6" />
                                        {auth?.user ? 'Ir al Dashboard' : 'Comenzar Ahora'}
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />

                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    </Link>
                                </Button>
                            </motion.div>
                        </motion.div>

                        {/* Características destacadas */}
                        <motion.div
                            variants={STAGGER_CONTAINER}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-5xl mx-auto"
                        >
                            <FeatureCard
                                icon={<Zap className="w-6 h-6 text-primary" />}
                                title="Velocidad Extrema"
                                description="Procesa ventas en segundos con nuestra interfaz optimizada"
                                delay={0.8}
                            />
                            <FeatureCard
                                icon={<BarChart3 className="w-6 h-6 text-primary" />}
                                title="Analytics Avanzados"
                                description="Visualiza el rendimiento de tu negocio en tiempo real"
                                delay={1.0}
                            />
                            <FeatureCard
                                icon={<Shield className="w-6 h-6 text-primary" />}
                                title="Seguridad Total"
                                description="Protección empresarial para tus datos y transacciones"
                                delay={1.2}
                            />
                        </motion.div>
                    </motion.div>

                    {/* Elementos decorativos flotantes */}
                    <motion.div
                        className="absolute top-1/4 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl"
                        animate={{
                            y: [0, -20, 0],
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360]
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    <motion.div
                        className="absolute top-1/3 right-10 w-16 h-16 bg-accent/20 rounded-full blur-xl"
                        animate={{
                            y: [0, 30, 0],
                            scale: [1, 0.8, 1],
                            rotate: [360, 180, 0]
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </main>

                {/* Footer mejorado */}
                <motion.footer
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="relative py-8 text-center border-t border-border/30 bg-background/80 backdrop-blur-sm"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
                    <div className="relative flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-primary" />
                        <span>
                            © {new Date().getFullYear()} StoneRetail. Construido para el éxito de tu negocio.
                        </span>
                        <Star className="w-4 h-4 text-primary" />
                    </div>
                </motion.footer>
            </div>
        </>
    );
}