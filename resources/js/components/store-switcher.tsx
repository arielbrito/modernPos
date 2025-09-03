// resources/js/components/store-switcher.tsx
import * as React from "react";
import { usePage, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Building2, Check } from "lucide-react";
import StoreSessionController from "@/actions/App/Http/Controllers/Auth/StoreSessionController";

type ActiveStore = { id: number; name: string; code?: string; logo_url?: string };
type StoreLite = { id: number; name: string; code?: string; logo_url?: string; is_active: boolean };

export default function StoreSwitcher() {
    const { props } = usePage<{ active_store?: ActiveStore | null; auth: { stores_active: StoreLite[] } }>();
    const active = props.active_store ?? null;
    const stores = props.auth?.stores_active ?? [];

    const switchTo = (id: number) => {
        if (active?.id === id) return;
        router.post(
            StoreSessionController.store['/switch-store'].url(), // 👈 nota el .store
            { store_id: id },
            { preserveScroll: true }
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 max-w-[240px]">
                    {active?.logo_url
                        ? <img src={active.logo_url} className="h-4 w-4 rounded" />
                        : <Building2 className="h-4 w-4" />
                    }
                    <span className="truncate">{active?.name ?? "Seleccionar tienda"}</span>
                    {active?.code && (
                        <span className="ml-1 hidden sm:inline text-xs text-muted-foreground">
                            ({active.code})
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs">Tus tiendas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stores.length ? (
                    stores.map((s) => (
                        <DropdownMenuItem
                            key={s.id}
                            onClick={() => switchTo(s.id)}
                            className="flex items-center gap-3"
                        >
                            {s.logo_url
                                ? <img src={s.logo_url} className="h-5 w-5 rounded" />
                                : <Building2 className="h-4 w-4 text-muted-foreground" />
                            }
                            <div className="min-w-0">
                                <div className="truncate">{s.name}</div>
                                {s.code && (
                                    <div className="text-xs text-muted-foreground truncate">{s.code}</div>
                                )}
                            </div>
                            {active?.id === s.id && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                    ))
                ) : (
                    <div className="p-3 text-sm text-muted-foreground">
                        No tienes tiendas activas.
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
