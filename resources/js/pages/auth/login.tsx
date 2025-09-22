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
import { LoaderCircle, Box, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

const Logo = () => (
    <div className="flex items-center gap-2 mb-8">
        <Box className="h-8 w-8 text-sidebar" />
        <span className="text-3xl font-bold tracking-tight text-sidebar">
            StoneRetail
        </span>
    </div>
);

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(AuthenticatedSessionController.store.url(), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Iniciar Sesión" />
            <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
                {/* Columna Izquierda: Branding y Bienvenida */}
                <div className="hidden lg:flex flex-col items-center justify-center p-10 bg-gradient-to-br bg-accent border-r dark:border-slate-800">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="text-center"
                    >
                        <Logo />
                        <h1 className="text-3xl font-bold tracking-tight mt-4">
                            Bienvenido de Nuevo
                        </h1>
                        <p className="mt-2  text-card-foreground">
                            Gestiona tus ventas e inventario de forma simple y eficiente.
                        </p>

                    </motion.div>
                </div>

                {/* Columna Derecha: Formulario de Login */}
                <div className="flex items-center justify-center p-6 sm:p-12 bg-sidebar">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full max-w-sm"
                    >
                        <div className="lg:hidden">
                            <Logo />
                        </div>
                        <div className="mb-6 text-left">
                            <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
                            <p className="text-muted-foreground">Ingresa tus credenciales para acceder a tu cuenta.</p>
                        </div>

                        {status && <div className="mb-4 text-sm font-medium text-green-600">{status}</div>}

                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email" type="email" name="email" value={data.email}
                                    autoComplete="username" autoFocus
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="tunegocio@email.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Contraseña</Label>
                                    {canResetPassword && (
                                        <Link href={request()} className="text-sm font-medium text-primary hover:underline">
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    )}
                                </div>
                                <Input
                                    id="password" type="password" name="password" value={data.password}
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox id="remember" checked={data.remember} onCheckedChange={(checked) => setData('remember', !!checked)} />
                                <Label htmlFor="remember">Recordarme</Label>
                            </div>

                            <Button type="submit" className="w-full h-11 font-bold" disabled={processing}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Ingresar
                            </Button>
                        </form>

                        {/* <div className="mt-6 text-center text-sm">
                            ¿No tienes una cuenta?{' '}
                            <Link href={register()} className="font-semibold text-primary hover:underline">
                                Regístrate aquí
                            </Link>
                        </div> */}
                    </motion.div>
                </div>
            </div>
        </>
    );
}