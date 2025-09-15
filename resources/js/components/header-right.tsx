// resources/js/components/layout/header-right.tsx
import * as React from 'react';

// ✅ Usa TUS componentes de tema:
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import AppearanceToggleTab from '@/components/appearance-tabs';

// ✅ Campana (si ya la tienes). Si no, puedes dejarla para después.
import NotificationBell from './notifications/notification-bell';

export default function HeaderRight({ children }: { children?: React.ReactNode }) {
    return (
        <div className="ml-auto flex items-center gap-2">
            {/* StoreSwitcher viene aquí como children */}
            {children}

            {/* En pantallas medianas+ muestra el conmutador tipo tabs */}
            <div className="hidden md:block">
                <AppearanceToggleTab />
            </div>

            {/* En móvil muestra el dropdown */}
            <div className="md:hidden">
                <AppearanceToggleDropdown />
            </div>

            {/* Campana de alertas */}
            <div className='mr-3'>
                <NotificationBell />
            </div>
        </div>
    );
}
