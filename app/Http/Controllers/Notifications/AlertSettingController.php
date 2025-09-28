<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\UserAlertSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertSettingController extends Controller
{
    public function edit(Request $r)
    {
        $s = $r->user()->alertSettings;
        return Inertia::render('alerts/settings', [
            'settings' => $s ? $s->only([
                'low_stock_enabled',
                'low_stock_threshold',
                'low_stock_channels',
                'low_stock_store_ids',
                'ncf_enabled',
                'ncf_threshold',
                'ncf_channels',
                'ncf_store_ids',
            ]) : null,
            'stores' => \App\Models\Store::select('id', 'code', 'name')->orderBy('name')->get(),
            'defaults' => [
                'low_stock_threshold' => (int)config('pos.alerts.low_stock_threshold', 3),
                'ncf_threshold'       => (int)config('pos.alerts.ncf_threshold', 50),
            ],
        ]);
    }

    public function update(Request $r)
    {
        $data = $r->validate([
            'low_stock_enabled'    => 'required|boolean',
            'low_stock_threshold'  => 'nullable|integer|min:0',
            'low_stock_channels'   => 'array',
            'low_stock_channels.*' => 'in:database,mail,broadcast',
            'low_stock_store_ids'  => 'array|nullable',
            'low_stock_store_ids.*' => 'integer|exists:stores,id',

            'ncf_enabled'          => 'required|boolean',
            'ncf_threshold'        => 'nullable|integer|min:0',
            'ncf_channels'         => 'array',
            'ncf_channels.*'       => 'in:database,mail,broadcast',
            'ncf_store_ids'        => 'array|nullable',
            'ncf_store_ids.*'      => 'integer|exists:stores,id',
        ]);

        $s = $r->user()->alertSettings()->updateOrCreate(
            ['user_id' => $r->user()->id],
            $data
        );

        return back()->with('success', 'Preferencias de alertas guardadas.');
    }
}
