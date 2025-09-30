<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Notifications\LowStockNotification;
use App\Notifications\NcfRunningLowNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AlertSettingController extends Controller
{
    /**
     * Muestra la página de configuración de alertas.
     */
    public function edit(Request $request)
    {
        $user = $request->user();
        $settings = $user->alertSettings;

        // Preparamos los datos para la vista, asegurando que siempre tengan una estructura válida.
        $data = [
            'low_stock_enabled'   => $settings->low_stock_enabled ?? true,
            'ncf_enabled'         => $settings->ncf_enabled ?? true,
            'low_stock_threshold' => $settings->low_stock_threshold ?? config('pos.alerts.low_stock_threshold', 3),
            'ncf_threshold'       => $settings->ncf_threshold ?? config('pos.alerts.ncf_threshold', 50),
            'channels'            => $settings->channels ?? [],
            'overrides'           => $settings->overrides ?? ['stores' => ['low_stock' => [], 'ncf' => []]],
            'quiet_hours'         => $settings->quiet_hours ?? ['start' => null, 'end' => null, 'tz' => null],
        ];

        return Inertia::render('alerts/settings', [
            'settings'         => $data,
            'stores'           => Store::select('id', 'code', 'name')->orderBy('name')->get(),
            'allowed_channels' => ['database', 'mail', 'broadcast'], // Definimos los canales permitidos
        ]);
    }

    /**
     * Actualiza la configuración de alertas del usuario.
     */
    public function update(Request $request)
    {
        // La validación ahora coincide con la estructura de la base de datos.
        $validatedData = $request->validate([
            'low_stock_enabled'   => 'required|boolean',
            'ncf_enabled'         => 'required|boolean',
            'low_stock_threshold' => 'required|integer|min:0',
            'ncf_threshold'       => 'required|integer|min:0',
            'channels'            => 'required|array', // Exigimos que siempre haya al menos un canal
            'channels.*'          => ['string', Rule::in(['database', 'mail', 'broadcast'])],

            // Usamos notación de punto para validar dentro del JSON.
            'overrides'                           => 'nullable|array',
            'overrides.stores.low_stock'          => 'nullable|array',
            'overrides.stores.low_stock.*'        => 'integer|exists:stores,id',
            'overrides.stores.ncf'                => 'nullable|array',
            'overrides.stores.ncf.*'              => 'integer|exists:stores,id',

            'quiet_hours'         => 'nullable|array',
            'quiet_hours.start'   => 'nullable|date_format:H:i',
            'quiet_hours.end'     => 'nullable|date_format:H:i',
            'quiet_hours.tz'      => 'nullable|timezone',
        ]);

        $request->user()->alertSettings()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $validatedData // Los datos ya tienen la estructura correcta.
        );

        return redirect()->route('settings.alerts.edit')->with('success', 'Preferencias de alertas guardadas.');
    }


    /**
     * Envía una notificación de prueba.
     * (Este método ya estaba bien y no necesita cambios).
     */
    public function test(Request $request)
    {
        $validatedData = $request->validate([
            'channels'   => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(['database', 'mail', 'broadcast'])],
            'type'       => ['required', Rule::in(['low_stock', 'ncf'])],
        ]);

        $user = $request->user();
        $channels = $validatedData['channels'];

        if ($validatedData['type'] === 'low_stock') {
            // Mock más realista para LowStockNotification
            $fakeRows = collect([
                (object)[
                    'store_id' => 1, // Propiedad que faltaba
                    'store'    => (object)['code' => 'MAIN', 'name' => 'Tienda Principal'],
                    'variant'  => (object)[
                        'sku'     => 'SKU-TEST',
                        'product' => (object)['name' => 'Producto Demo']
                    ],
                    'quantity' => 2, // Propiedad que faltaba
                ]
            ]);

            $user->notify(
                (new LowStockNotification($fakeRows, 3, null))->setChannels($channels)
            );
        } else { // 'ncf'
            // Mock más realista para NcfRunningLowNotification
            $fakeSeqs = collect([
                (object)[
                    'store_id'    => 1, // Aseguramos que esta propiedad exista
                    'store'       => (object)['code' => 'MAIN', 'name' => 'Tienda Principal'],
                    'type'        => 'B01',
                    'end_number'  => 10,
                    'next_number' => 9,
                ]
            ]);

            $user->notify(
                (new NcfRunningLowNotification($fakeSeqs, 5))->setChannels($channels)
            );
        }

        return response()->json(['ok' => true]);
    }
}
