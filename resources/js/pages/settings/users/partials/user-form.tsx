/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { type User, type Role, type Store } from '@/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import InputError from '@/components/input-error';
import UserController from '@/actions/App/Http/Controllers/Settings/UserController';
import {
    User as UserIcon,
    Mail,
    Lock,
    Shield,
    Store as StoreIcon,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Crown,
    Building2,
    Save,
    UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

type UserWithRels = User & {
    roles?: Array<Pick<Role, 'id' | 'name'>>;
    stores?: Array<Pick<Store, 'id' | 'name'>>;
};

interface UserFormProps {
    user?: UserWithRels;
    roles: Role[];
    stores: Store[];
}

type UserPayload = {
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    role_id: number | '';
    store_ids: number[];
};

// Componente de indicador de fortaleza de contraseña
const PasswordStrength = ({ password }: { password: string }) => {
    const calculateStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length >= 8) score += 25;
        if (/[a-z]/.test(pwd)) score += 25;
        if (/[A-Z]/.test(pwd)) score += 25;
        if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 25;
        return score;
    };

    const strength = calculateStrength(password);
    const getColor = () => {
        if (strength < 50) return "bg-red-500";
        if (strength < 75) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getLabel = () => {
        if (strength < 25) return "Muy débil";
        if (strength < 50) return "Débil";
        if (strength < 75) return "Moderada";
        return "Fuerte";
    };

    if (!password) return null;

    return (
        <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Fortaleza de la contraseña</span>
                <span className="text-xs font-medium">{getLabel()}</span>
            </div>
            <Progress value={strength} className="h-1">
                <div className={`h-full rounded-full transition-all ${getColor()}`} style={{ width: `${strength}%` }} />
            </Progress>
        </div>
    );
};

// Componente de campo de entrada mejorado
const FormField = ({
    label,
    icon,
    required = false,
    children,
    error,
    description
}: {
    label: string;
    icon?: React.ReactNode;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
    description?: string;
}) => (
    <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {label}
            {required && <span className="text-red-500">*</span>}
        </Label>
        {children}
        {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <InputError message={error} className="mt-1" />
    </div>
);

export default function UserForm({ user, roles, stores }: UserFormProps) {
    const isEditing = !!user;
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [formStep, setFormStep] = useState(0);

    const getInitialData = (currentUser?: UserWithRels): UserPayload => ({
        name: currentUser?.name ?? '',
        email: currentUser?.email ?? '',
        password: '',
        password_confirmation: '',
        role_id: currentUser?.roles?.[0]?.id ?? '',
        store_ids: currentUser?.stores?.map(s => Number(s.id)) ?? [],
    });

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset,
        clearErrors,
        transform,
    } = useForm<UserPayload>(getInitialData(user));


    // Calcular progreso del formulario
    const calculateProgress = () => {
        let progress = 0;
        if (data.name.trim()) progress += 25;
        if (data.email.trim()) progress += 25;
        if (isEditing || data.password) progress += 25;
        if (data.role_id !== '') progress += 15;
        if (data.store_ids.length > 0) progress += 10;
        return Math.min(progress, 100);
    };

    useEffect(() => {
        // Ahora es mucho más limpio
        setData(getInitialData(user));
        clearErrors();
    }, [user])

    transform((payload) => {
        const out: any = { ...payload };
        out.role_id = out.role_id === '' ? '' : Number(out.role_id);
        out.store_ids = Array.isArray(out.store_ids) ? out.store_ids.map((id: any) => Number(id)) : [];
        if (isEditing && !out.password) {
            delete out.password;
            delete out.password_confirmation;
        }
        return out;
    });

    const handleStoreToggle = (storeId: number) => {
        setData('store_ids',
            data.store_ids.includes(storeId)
                ? data.store_ids.filter(id => id !== storeId)
                : [...data.store_ids, storeId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && user) {
            put(UserController.update.url({ user: user.id }), {
                preserveScroll: true,
                onSuccess: () => toast.success("Usuario actualizado correctamente"),
                onError: () => toast.error("Error al actualizar usuario"),
            });
        } else {
            post(UserController.store.url(), {
                preserveScroll: true,
                onSuccess: () => toast.success("Usuario creado correctamente"),
                onError: () => toast.error("Error al crear usuario"),
            });
        }
    };

    const selectedRole = roles.find(r => r.id === data.role_id);
    const progress = calculateProgress();

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Progress Header */}
            <Card className="shadow-sm border-l-4 border-l-primary">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10">
                                {isEditing ? <UserIcon className="h-4 w-4 text-primary" /> : <UserPlus className="h-4 w-4 text-primary" />}
                            </div>
                            <span className="font-medium">
                                {isEditing ? 'Actualizando Usuario' : 'Creando Usuario'}
                            </span>
                        </div>
                        <Badge variant={progress === 100 ? "default" : "secondary"} className="gap-1">
                            {progress === 100 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {progress}% Completo
                        </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardContent>
            </Card>

            {/* Información Personal */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                        Información Personal
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        label="Nombre Completo"
                        icon={<UserIcon className="h-4 w-4" />}
                        required
                        error={errors.name}
                        description="Nombre completo del usuario tal como aparecerá en el sistema"
                    >
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej: Juan Carlos Pérez"
                            className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </FormField>

                    <FormField
                        label="Correo Electrónico"
                        icon={<Mail className="h-4 w-4" />}
                        required
                        error={errors.email}
                        description="Email único para iniciar sesión y notificaciones"
                    >
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="usuario@ejemplo.com"
                            className="transition-all focus:ring-2 focus:ring-primary/20"
                        />
                    </FormField>

                    <FormField
                        label={isEditing ? "Nueva Contraseña" : "Contraseña"}
                        icon={<Lock className="h-4 w-4" />}
                        required={!isEditing}
                        error={errors.password}
                        description={isEditing ? "Dejar en blanco para mantener la actual" : "Mínimo 8 caracteres, incluir mayúsculas y números"}
                    >
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={data.password ?? ''}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={isEditing ? 'Dejar vacío si no desea cambiar' : 'Ingrese una contraseña segura'}
                                className="pr-10 transition-all focus:ring-2 focus:ring-primary/20"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        <PasswordStrength password={data.password || ''} />
                    </FormField>

                    <FormField
                        label="Confirmar Contraseña"
                        icon={<Lock className="h-4 w-4" />}
                        error={errors.password_confirmation}
                    >
                        <div className="relative">
                            <Input
                                id="password_confirmation"
                                type={showPasswordConfirm ? "text" : "password"}
                                value={data.password_confirmation ?? ''}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="Repita la contraseña"
                                className="pr-10 transition-all focus:ring-2 focus:ring-primary/20"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            >
                                {showPasswordConfirm ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </FormField>
                </CardContent>
            </Card>

            {/* Roles y Permisos */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        Roles y Permisos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        label="Rol del Usuario"
                        icon={<Crown className="h-4 w-4" />}
                        error={errors.role_id}
                        description="Define los permisos y accesos del usuario en el sistema"
                    >
                        <Select
                            value={String(data.role_id)}
                            onValueChange={(v) => setData('role_id', v === '' ? '' : Number(v))}
                        >
                            <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                                <SelectValue placeholder="Seleccionar un rol..." />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(role => (
                                    <SelectItem key={role.id} value={String(role.id)}>
                                        <div className="flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-amber-600" />
                                            {role.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    {selectedRole && (
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                                <Crown className="h-4 w-4" />
                                Rol Seleccionado
                            </div>
                            <p className="text-sm text-amber-700">
                                {selectedRole.name} - Este rol determinará los permisos y accesos del usuario.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tiendas Asignadas */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-green-600" />
                            Tiendas Asignadas
                        </CardTitle>
                        <Badge variant="secondary" className="gap-1">
                            <StoreIcon className="h-3 w-3" />
                            {data.store_ids.length} seleccionadas
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField
                        label=""
                        error={errors.store_ids}
                        description={`Selecciona las tiendas a las que el usuario tendrá acceso (${data.store_ids.length} de ${stores.length} seleccionadas)`}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border rounded-lg bg-muted/20">
                            {stores.map(store => {
                                const isSelected = data.store_ids.includes(store.id);
                                return (
                                    // 1. El contenedor principal ahora es un <Label>.
                                    //    Hereda la key y todas las clases del antiguo div.
                                    //    Esto hace que toda el área sea semánticamente un label para el checkbox.
                                    <Label
                                        key={store.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                            ? 'bg-green-50 border-green-200 shadow-sm'
                                            : 'bg-white hover:bg-muted/50 border-muted'
                                            }`}
                                    >
                                        {/* 2. El manejador de eventos ahora está *únicamente* en el Checkbox.
                           Esta es la única fuente de verdad para actualizar el estado. */}
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleStoreToggle(store.id)}
                                            className="data-[state=checked]:bg-green-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Building2 className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-muted-foreground'}`} />

                                                {/* 3. El antiguo Label para el texto se convierte en un <span>.
                                   Es más correcto semánticamente y ya no necesita 'htmlFor'. */}
                                                <span
                                                    className={`text-sm cursor-pointer truncate ${isSelected ? 'text-green-800 font-medium' : ''}`}
                                                >
                                                    {store.name}
                                                </span>
                                            </div>
                                        </div>
                                    </Label>
                                );
                            })}
                        </div>
                    </FormField>

                    {data.store_ids.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Tiendas Seleccionadas ({data.store_ids.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {stores
                                    .filter(store => data.store_ids.includes(store.id))
                                    .map(store => (
                                        <Badge
                                            key={store.id}
                                            variant="secondary"
                                            className="bg-green-100 text-green-800 border-green-200"
                                        >
                                            <Building2 className="h-3 w-3 mr-1" />
                                            {store.name}
                                        </Badge>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full sm:w-auto">
                                <Button
                                    type="submit"
                                    disabled={processing || progress < 75}
                                    className="w-full sm:w-auto gap-2 shadow-sm"
                                    size="lg"
                                >
                                    <Save className="h-4 w-4" />
                                    {processing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            {isEditing ? 'Actualizando...' : 'Creando...'}
                                        </>
                                    ) : (
                                        <>
                                            {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {progress < 75 ? 'Complete los campos requeridos para continuar' : 'Guardar usuario'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </form>
    );
}