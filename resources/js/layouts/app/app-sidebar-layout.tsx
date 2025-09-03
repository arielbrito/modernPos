/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { useEffect, type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import StoreSwitcher from '@/components/store-switcher'; // 👈 importa el switcher

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { props, url } = usePage();
    useEffect(() => {
        const successMessage = (props.flash as any)?.success;
        if (successMessage) {
            // Sonner's API is simpler
            toast.success('Success!', {
                description: successMessage,
            });
        }

        const errorMessage = (props.flash as any)?.error;
        if (errorMessage) {
            toast.error('Error!', {
                description: errorMessage,
            });
        }
    }, [props.flash]);

    const pathname = (url as string)?.split('?')[0];
    const showSwitcher = pathname !== '/select-store';
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} right={showSwitcher ? <StoreSwitcher /> : null} />
                {children}
            </AppContent>
            <Toaster position="top-right" richColors />
        </AppShell>
    );
}
