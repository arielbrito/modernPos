import React, { useRef, useEffect, useState } from 'react';
import { Head, usePage, useForm } from '@inertiajs/react';
import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { toast } from 'sonner';

// 1. --- IMPORTAR EL CONTROLADOR DE WAYFINDER ---
import ReceiptSettingController from '@/actions/App/Http/Controllers/Settings/ReceiptSettingController';

import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, X, Check } from 'lucide-react';
import InputError from '@/components/input-error';

// --- TIPOS DE DATOS ---
interface ReceiptSettings {
    id: number;
    company_name: string;
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_path: string | null;
    logo_url: string | null;
    footer_message: string | null;
    terms_and_conditions: string | null;
}

interface ReceiptSettingsPageProps extends InertiaPageProps {
    settings: ReceiptSettings;
    flash?: {
        success?: string;
        error?: string;
    };
}


export default function ReceiptSettingsPage() {
    const { props } = usePage<ReceiptSettingsPageProps>();
    const { settings, flash } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<{
        company_name: string;
        tax_id: string;
        address: string;
        phone: string;
        email: string;
        website: string;
        footer_message: string;
        terms_and_conditions: string;
        logo: File | null;
        _method: 'put';
    }>({
        company_name: settings.company_name || '',
        tax_id: settings.tax_id || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        footer_message: settings.footer_message || '',
        terms_and_conditions: settings.terms_and_conditions || '',
        logo: null,
        _method: 'put',
    });

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('logo', file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const clearLogo = () => {
        setData('logo', null);
        setLogoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 2. --- USAR LA URL DEL CONTROLADOR DE WAYFINDER ---
        post(ReceiptSettingController.update.url(), {
            onSuccess: () => {
                clearLogo();
            },
            forceFormData: true,
        });
    };

    return (
        <AppLayout>
            <Head title="Configuración de Recibos" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración de Recibos</CardTitle>
                            <CardDescription>
                                Personaliza la información que aparece en los tickets de venta impresos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* --- Sección de Logo --- */}
                            <div className="space-y-2">
                                <Label htmlFor="logo" className="text-base font-semibold">Logo de la Empresa</Label>
                                <div className="flex items-center gap-6">
                                    <div className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                                        <img
                                            src={logoPreview || settings.logo_url || 'https://placehold.co/128x128/e2e8f0/7c8e9a?text=Logo'}
                                            alt="Previsualización del logo"
                                            className="h-full w-full object-contain rounded-md"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            {data.logo ? 'Cambiar Logo' : 'Subir Logo'}
                                        </Button>
                                        {(data.logo || settings.logo_path) && (
                                            <Button type="button" variant="ghost" size="sm" onClick={clearLogo}>
                                                <X className="mr-2 h-4 w-4" /> Quitar
                                            </Button>
                                        )}
                                        <input
                                            id="logo"
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={handleLogoChange}
                                            accept="image/png, image/jpeg, image/webp"
                                        />
                                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP. Máximo 1MB.</p>
                                    </div>
                                </div>
                                <InputError message={errors.logo} />
                            </div>

                            {/* --- Información de la Empresa --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Nombre de la Empresa</Label>
                                    <Input id="company_name" value={data.company_name} onChange={e => setData('company_name', e.target.value)} />
                                    <InputError message={errors.company_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tax_id">RNC / ID Fiscal</Label>
                                    <Input id="tax_id" value={data.tax_id} onChange={e => setData('tax_id', e.target.value)} />
                                    <InputError message={errors.tax_id} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Textarea id="address" value={data.address} onChange={e => setData('address', e.target.value)} rows={2} />
                                    <InputError message={errors.address} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input id="phone" value={data.phone} onChange={e => setData('phone', e.target.value)} />
                                    <InputError message={errors.phone} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="website">Sitio Web</Label>
                                    <Input id="website" type="url" value={data.website} onChange={e => setData('website', e.target.value)} placeholder="https://ejemplo.com" />
                                    <InputError message={errors.website} />
                                </div>
                            </div>

                            {/* --- Mensajes del Recibo --- */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="footer_message">Mensaje de Pie de Página</Label>
                                    <Textarea id="footer_message" value={data.footer_message} onChange={e => setData('footer_message', e.target.value)} placeholder="¡Gracias por su compra!" rows={2} />
                                    <InputError message={errors.footer_message} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="terms_and_conditions">Términos y Condiciones (Opcional)</Label>
                                    <Textarea id="terms_and_conditions" value={data.terms_and_conditions} onChange={e => setData('terms_and_conditions', e.target.value)} rows={3} />
                                    <InputError message={errors.terms_and_conditions} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-4 items-center">
                            {recentlySuccessful && (
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Guardado
                                </span>
                            )}
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}

