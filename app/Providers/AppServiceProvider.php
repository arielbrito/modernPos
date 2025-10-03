<?php

namespace App\Providers;

use App\Models\ProductStockMovement;
use App\Models\Store;
use App\Observers\ProductStockMovementObserver;
use App\Observers\StoreObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define(
            'dgii.lookup',
            fn($user) =>
            // ajusta a tu lógica real
            $user->hasRole('Super-Admin') || $user->can('customers.view')
        );
        Gate::define('dgii.import', fn($u) => $u->can('dgii.import'));
        Gate::define('ncf.manage', fn($u) => $u->can('ncf.manage'));
        Gate::define('ncf.consume', fn($u) => $u->can('ncf.consume'));
        Gate::define('ncf.view', fn($u) => $u->can('ncf.view'));
        Gate::define('ncf.peek', fn($u) => $u->can('ncf.peek'));
        Gate::define('registers.view', fn($u) => $u->can('registers.view'));
        Gate::define('registers.manage', fn($u) => $u->can('registers.manage'));
        Gate::define('registers.select', fn($u) => $u->can('registers.select'));
        Gate::define('cash_shirt.open', fn($u) => $u->can('cash_shirt.open'));


        RateLimiter::for('dgii-status', function (Request $request) {
            return [
                Limit::perMinute(60)->by(optional($request->user())->id ?: $request->ip()),
            ];
        });

        Store::observe(StoreObserver::class);
        // ProductStockMovement::observe(ProductStockMovementObserver::class);
    }
}
