import AppLogoIcon from './app-logo-icon';
import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { active_store } = usePage().props as { active_store?: { id: number; name: string; code?: string; logo_url?: string } | null };
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold"> {active_store?.name ?? 'StoneRetail'} </span>
            </div>
        </>
    );
}
