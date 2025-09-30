/* eslint-disable @typescript-eslint/no-unused-vars */
import AuthenticatedSessionController from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register } from '@/routes';
import { request } from '@/routes/password';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    LoaderCircle,
    Box,
    LogIn,
    Shield,
    Zap,
    BarChart3,
    ArrowRight,
    Eye,
    EyeOff,
    Mail,
    Lock,
    Sparkles
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import React, { useState, useEffect } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

// Partículas flotantes para el background
const FloatingParticle = ({ delay = 0, duration = 6, x = 0, y = 0 }) => (
    <motion.div
        className="absolute w-1 h-1 bg-primary/30 rounded-full blur-sm"
        animate={{
            y: [y, y - 150, y],
            x: [x, x + 30, x - 30, x],
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1.5, 0],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    />
);

const Logo = () => (
    <motion.div
        className="flex items-center gap-3 mb-8 group"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400 }}
    >
        <motion.div
            className="relative p-2 bg-primary/15 rounded-2xl border border-primary/30"
            whileHover={{
                rotate: 360,
                background: "linear-gradient(135deg, var(--color-primary), var(--color-stoneretail-primary-light))"
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
        >
            <Box className="h-7 w-7 text-primary group-hover:text-white transition-colors duration-300" />
            <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            StoneRetail
        </span>

        <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
        />
    </motion.div>
);

// Feature Card para el lado izquierdo
const FeatureCard = ({ icon, title, description, delay }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay: number;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.6, type: "spring" }}
        className="flex items-center gap-4 p-4 bg-background/10 backdrop-blur-sm rounded-2xl border border-border/20 hover:bg-background/20 transition-all duration-300 group"
    >
        <div className="p-3 bg-primary/20 rounded-xl border border-primary/30 group-hover:scale-110 transition-transform duration-200">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </motion.div>
);

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 300], [0, -50]);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    // Seguimiento del mouse para efectos parallax
    useEffect(() => {
        const updateMousePosition = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', updateMousePosition);
        return () => window.removeEventListener('mousemove', updateMousePosition);
    }, []);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(AuthenticatedSessionController.store.url(), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Iniciar Sesión" />
            <div className="min-h-screen w-full lg:grid lg:grid-cols-2 relative overflow-hidden">

                {/* Fondo animado global */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10"></div>

                {/* Partículas flotantes */}
                {Array.from({ length: 12 }, (_, i) => (
                    <FloatingParticle
                        key={i}
                        delay={i * 0.8}
                        duration={6 + (i % 3)}
                        x={Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200)}
                        y={Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)}
                    />
                ))}

                {/* Efecto de cursor personalizado */}
                <motion.div
                    className="fixed top-0 left-0 w-4 h-4 bg-primary/30 rounded-full pointer-events-none z-50 blur-sm hidden lg:block"
                    animate={{
                        x: mousePosition.x - 8,
                        y: mousePosition.y - 8,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />

                {/* Columna Izquierda: Branding y Bienvenida */}
                <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 border-r-2 border-border/30 relative overflow-hidden">
                    {/* Elementos decorativos de fondo */}
                    <div className="absolute top-0 left-0 right-0 h-2 gradient-stoneretail"></div>
                    <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                    <motion.div
                        style={{ y: y1 }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="text-center relative z-10 max-w-lg"
                    >
                        <Logo />

                        <motion.h1
                            className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                        >
                            Bienvenido de Nuevo
                        </motion.h1>

                        <motion.p
                            className="text-lg text-muted-foreground mb-8 leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                        >
                            Gestiona tus ventas e inventario con la plataforma más avanzada del mercado.
                        </motion.p>

                        {/* Feature cards */}
                        <div className="space-y-4 max-w-md mx-auto">
                            <FeatureCard
                                icon={<Zap className="w-5 h-5 text-primary" />}
                                title="Velocidad Extrema"
                                description="Procesa ventas en tiempo real"
                                delay={0.7}
                            />
                            <FeatureCard
                                icon={<BarChart3 className="w-5 h-5 text-primary" />}
                                title="Analytics Avanzados"
                                description="Datos que impulsan tu negocio"
                                delay={0.9}
                            />
                            <FeatureCard
                                icon={<Shield className="w-5 h-5 text-primary" />}
                                title="Seguridad Total"
                                description="Protección empresarial garantizada"
                                delay={1.1}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Columna Derecha: Formulario de Login */}
                <div className="flex items-center justify-center p-6 sm:p-12 bg-background/95 backdrop-blur-sm relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full max-w-md relative"
                    >
                        {/* Card container con glassmorphism */}
                        <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border-2 border-border/50 shadow-2xl p-8 overflow-hidden">
                            {/* Efectos de gradiente */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 gradient-stoneretail"></div>

                            <div className="relative z-10">
                                <div className="lg:hidden mb-6">
                                    <Logo />
                                </div>

                                <div className="mb-8 text-center lg:text-left">
                                    <motion.div
                                        className="flex items-center gap-3 justify-center lg:justify-start mb-4"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                    >
                                        <div className="bg-primary/15 rounded-xl p-2 border border-primary/30">
                                            <LogIn className="w-5 h-5 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground">Iniciar Sesión</h2>
                                    </motion.div>
                                    <motion.p
                                        className="text-muted-foreground"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                    >
                                        Ingresa tus credenciales para acceder a tu cuenta
                                    </motion.p>
                                </div>

                                {status && (
                                    <motion.div
                                        className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {status}
                                    </motion.div>
                                )}

                                <motion.form
                                    onSubmit={submit}
                                    className="space-y-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-primary" />
                                            Email
                                        </Label>
                                        <div className="relative group">
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                value={data.email}
                                                autoComplete="username"
                                                autoFocus
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="tunegocio@email.com"
                                                className="h-12 rounded-xl border-2 pos-input pos-focus transition-all duration-200 hover:border-primary/40 pl-4"
                                            />
                                            <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 -z-10"></div>
                                        </div>
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-primary" />
                                                Contraseña
                                            </Label>
                                            {canResetPassword && (
                                                <Link
                                                    href={request()}
                                                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200 hover:underline"
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </Link>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={data.password}
                                                autoComplete="current-password"
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder="••••••••"
                                                className="h-12 rounded-xl border-2 pos-input pos-focus transition-all duration-200 hover:border-primary/40 pr-12 pl-4"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors duration-200"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                            <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 -z-10"></div>
                                        </div>
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="remember"
                                            checked={data.remember}
                                            onCheckedChange={(checked) => setData('remember', !!checked)}
                                            className="rounded-md border-2"
                                        />
                                        <Label htmlFor="remember" className="text-sm font-medium cursor-pointer">
                                            Recordarme en este dispositivo
                                        </Label>
                                    </div>

                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Button
                                            type="submit"
                                            className="w-full h-12 font-bold text-base rounded-xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-200 relative overflow-hidden group"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <>
                                                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                                                    Ingresando...
                                                </>
                                            ) : (
                                                <>
                                                    <LogIn className="mr-2 h-5 w-5" />
                                                    Ingresar al Sistema
                                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                                                </>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                        </Button>
                                    </motion.div>
                                </motion.form>

                                {/* Footer info */}
                                <motion.div
                                    className="mt-8 text-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.5 }}
                                >
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-accent/30 rounded-lg px-3 py-2">
                                        <Shield className="w-3 h-3" />
                                        <span>Conexión segura • StoneRetail {new Date().getFullYear()}</span>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
}