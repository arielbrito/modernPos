<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreStoreRequest;
use App\Http\Requests\Settings\UpdateStoreRequest;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class StoreController extends Controller
{
    use AuthorizesRequests;
    // public function __construct()
    // {
    //     $this->authorizeResource(\App\Models\Store::class, 'store');
    // }
    /**
     * Muestra la lista de tiendas.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Store::class);


        $q = trim((string) $request->get('q', ''));

        $stores = Store::query()
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%{$q}%")
                        ->orWhere('rnc', 'like', "%{$q}%")
                        ->orWhere('phone', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->latest()
            ->paginate(20)
            ->appends(['q' => $q]);

        return Inertia::render('settings/stores/index', [
            'tiendas' => $stores,
            'filters' => ['q' => $q],
        ]);
    }

    /**
     * Muestra el formulario para crear una nueva tienda.
     */
    public function create()
    {
        $this->authorize('create', Store::class);
        return Inertia::render('Settings/Stores/Create');
    }

    /**
     * Guarda una nueva tienda en la base de datos.
     */
    public function store(StoreStoreRequest $request)
    {
        $this->authorize('create', Store::class);

        $validatedData = $request->validated();
        $logoPath = null;

        // Manejar la subida del logo
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('logos/stores', 'public');
        }

        Store::create([
            ...$validatedData,
            'code' => $this->generateStoreCode($validatedData['name']),
            'logo' => $logoPath,
        ]);

        return to_route('stores.index')->with('success', 'Tienda creada exitosamente.');

        // return redirect()->route('stores.index')->with('success', 'Tienda creada exitosamente.');
    }

    /**
     * Muestra el formulario para editar una tienda existente.
     */
    public function edit(Store $store)
    {
        $this->authorize('update', $store);

        return Inertia::render('settings/stores/edit', [
            'store' => $store,
        ]);
    }

    public function show(Store $store)
    {
        $this->authorize('view', $store);
        return Inertia::render('settings/stores/show', [
            'store' => $store->only(['id', 'name', 'code', 'currency', 'is_active']),
        ]);
    }

    /**
     * Actualiza una tienda existente.
     */
    public function update(UpdateStoreRequest $request, Store $store)
    {
        $this->authorize('update', $store);
        // Excluimos 'logo' del payload de campos simples
        $data = $request->safe()->except('logo');

        // Si hay archivo nuevo, guárdalo primero
        if ($request->hasFile('logo')) {
            $newPath = $request->file('logo')->store('logos/stores', 'public');

            // Si se guardó, borra el anterior (si existía)
            if ($store->logo && $store->logo !== $newPath) {
                Storage::disk('public')->delete($store->logo);
            }

            // Actualiza la ruta del logo en el payload
            $data['logo'] = $newPath;
        }

        $store->update($data);

        return to_route('stores.index')->with('success', 'Tienda actualizada exitosamente.');
        // Si prefieres volver al detalle:
        // return to_route('stores.show', $store);
    }

    /**
     * Elimina una tienda.
     */
    public function destroy(Store $store)
    {
        $this->authorize('delete', $store);
        // Medida de seguridad: Prevenir borrado si la tienda tiene ventas o inventario.
        // La lógica específica dependerá de tus relaciones.
        if ($store->purchases()->exists() || $store->inventory()->exists()) {
            return back()->with('error', 'No se puede eliminar la tienda porque tiene registros asociados (compras, inventario, etc.).');
        }

        DB::transaction(function () use ($store) {
            // Borrar el logo del almacenamiento
            if ($store->logo) {
                Storage::disk('public')->delete($store->logo);
            }
            // Borrar la tienda de la base de datos
            $store->delete();
        });

        return redirect()->route('stores.index')->with('success', 'Tienda eliminada.');
    }

    /**
     * Genera un código de tienda único a partir de sus iniciales.
     * Ejemplo: "Supermercado La Confianza" -> "SLC-001"
     */
    private function generateStoreCode(string $name): string
    {
        // Tomar las iniciales de las primeras 3 palabras
        $initials = Str::upper(
            collect(explode(' ', $name, 3))
                ->map(fn($word) => substr($word, 0, 1))
                ->join('')
        );

        // Buscar el último código con las mismas iniciales para obtener el secuencial
        $lastStore = Store::where('code', 'like', $initials . '-%')->orderBy('code', 'desc')->first();
        $nextNumber = 1;

        if ($lastStore) {
            $lastNumber = (int) substr($lastStore->code, -3);
            $nextNumber = $lastNumber + 1;
        }

        return $initials . '-' . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT);
    }
}
