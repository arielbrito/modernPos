<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ReceiptSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ReceiptSettingController extends Controller
{
    public function edit()
    {
        // Usamos firstOrCreate para asegurar que siempre haya un registro de configuración.
        $settings = ReceiptSetting::firstOrCreate(
            ['id' => 1], // Siempre trabajamos sobre el primer y único registro
            ['company_name' => config('app.name', 'Mi Negocio')]
        );

        return Inertia::render('settings/receipt', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'tax_id' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'logo' => 'nullable|image|max:1024', // Logo de max 1MB
            'footer_message' => 'nullable|string',
            'terms_and_conditions' => 'nullable|string',
        ]);

        $settings = ReceiptSetting::find(1);

        if ($request->hasFile('logo')) {
            // Elimina el logo anterior si existe
            if ($settings->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }
            // Guarda el nuevo logo y actualiza la ruta
            $validated['logo_path'] = $request->file('logo')->store('logos', 'public');
        }

        unset($validated['logo']); // Quitamos el archivo del array a guardar

        $settings->update($validated);

        return back()->with('success', 'Configuración del ticket actualizada.');
    }
}
