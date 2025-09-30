import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { usePosContext } from '@/pages/pos/hooks/usePosContext';
import { logout } from '@/routes';
// import { edit } from '@/routes/profile';
import { type User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import { PageProps } from './../types/index.d';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserMenuContentProps {
    user: User;

}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { props } = usePage<PageProps>();


    const activeShiftId = props.context?.active_shift_id

    const handleLogout = () => {
        cleanup();
        // router.flushAll();
    };

    const logoutItem = (
        <DropdownMenuItem asChild>
            <Link
                className="block w-full cursor-pointer"
                href={logout()}
                method="post" // Es crucial usar 'post' para el logout por seguridad.
                as="button"
                onClick={handleLogout}
            >
                <LogOut className="mr-2" />
                Cerrar sesión
            </Link>
        </DropdownMenuItem>
    );

    const disabledLogoutItem = (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* El div contenedor es necesario para que el Tooltip se active sobre un elemento deshabilitado */}
                    <div>
                        <DropdownMenuItem disabled className="cursor-not-allowed">
                            <LogOut className="mr-2" />
                            Cerrar sesión
                        </DropdownMenuItem>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Debes cerrar tu turno de caja para poder salir.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {activeShiftId ? disabledLogoutItem : logoutItem}
        </>
    );
}
