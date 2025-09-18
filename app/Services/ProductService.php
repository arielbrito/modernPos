<?php

namespace App\Services;

use App\Http\Requests\Inventory\StoreProductRequest;
use App\Http\Requests\Inventory\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Arr;

class ProductService
{
    public function createProduct(StoreProductRequest $request): Product
    {
        $validated = $request->validated();

        return DB::transaction(function () use ($validated, $request) {
            $productData = Arr::only($validated, [
                'name',
                'slug',
                'description',
                'product_nature',
                'category_id',
                'supplier_id',
                'type',
                'unit',
                'is_active'
            ]);

            $product = Product::create($productData);

            $generalImagePath = $request->hasFile('image')
                ? $request->file('image')->store('images/products', 'public')
                : null;

            foreach ($validated['variants'] as $i => $variantData) {
                $variantImagePath = $request->file("variants.{$i}.image")
                    ? $request->file("variants.{$i}.image")->store('images/products', 'public')
                    : ($i === 0 ? $generalImagePath : null);

                $product->variants()->create([
                    'sku' => $variantData['sku'],
                    'barcode' => $variantData['barcode'] ?? null,
                    'selling_price' => $variantData['selling_price'],
                    'cost_price' => $variantData['cost_price'] ?? 0,
                    'attributes' => $this->normalizeAttributes($variantData['attributes'] ?? null),
                    'is_taxable' => $variantData['is_taxable'] ?? false,
                    'tax_code' => $variantData['tax_code'] ?? null,
                    'tax_rate' => $variantData['tax_rate'] ?? null,
                    'image_path' => $variantImagePath,
                ]);
            }

            return $product;
        });
    }

    public function updateProduct(UpdateProductRequest $request, Product $product): Product
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request, $product) {
            $productData = Arr::only($validated, [
                'name',
                'slug',
                'description',
                'product_nature',
                'category_id',
                'supplier_id',
                'type',
                'unit',
                'is_active'
            ]);
            $product->update($productData);

            $incomingVariantIds = collect($validated['variants'])->pluck('id')->filter()->all();

            // Desactivar o eliminar variantes que ya no existen en el request
            $product->variants()->whereNotIn('id', $incomingVariantIds)->get()->each(function ($variant) {
                if ($variant->hasBeenUsed()) { // Asumiendo que tienes un método así en el modelo
                    $variant->update(['is_active' => false]);
                } else {
                    if ($variant->image_path) {
                        Storage::disk('public')->delete($variant->image_path);
                    }
                    $variant->delete();
                }
            });

            foreach ($validated['variants'] as $variantData) {
                $product->variants()->updateOrCreate(
                    ['id' => $variantData['id'] ?? null], // Condición para buscar
                    [ // Datos para actualizar o crear
                        'sku' => $variantData['sku'],
                        'barcode' => $variantData['barcode'] ?? null,
                        'selling_price' => $variantData['selling_price'],
                        'cost_price' => $variantData['cost_price'] ?? 0,
                        'attributes' => $this->normalizeAttributes($variantData['attributes'] ?? null),
                        'is_taxable' => $variantData['is_taxable'] ?? false,
                        'tax_code' => $variantData['tax_code'] ?? null,
                        'tax_rate' => $variantData['tax_rate'] ?? null,
                    ]
                );
            }
            if ($request->hasFile('image')) {
                // Asumimos que la imagen principal corresponde a la primera variante
                $variantToUpdate = $product->variants()->first();

                if ($variantToUpdate) {
                    // Borrar la imagen antigua si existe
                    if ($variantToUpdate->image_path) {
                        Storage::disk('public')->delete($variantToUpdate->image_path);
                    }

                    // Guardar la nueva imagen y actualizar la ruta
                    $imagePath = $request->file('image')->store('images/products', 'public');
                    $variantToUpdate->update(['image_path' => $imagePath]);
                }
            }
        });

        return $product->fresh('variants');
    }

    private function normalizeAttributes($value): ?array
    {
        if ($value === null || $value === '') return null;

        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $k = trim((string)$k);
                if ($k === '') continue;
                $out[$k] = is_scalar($v) ? trim((string)$v) : json_encode($v);
            }
            return $out ?: null;
        }

        // string "Color:Rojo, Talla:M"
        $pairs = array_filter(array_map('trim', explode(',', (string)$value)));
        $out = [];
        foreach ($pairs as $p) {
            [$k, $v] = array_pad(array_map('trim', explode(':', $p, 2)), 2, null);
            if ($k !== null && $k !== '') $out[$k] = $v ?? '';
        }
        return $out ?: null;
    }
}
