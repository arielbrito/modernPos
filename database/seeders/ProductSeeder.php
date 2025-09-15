<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Enums\ProductNature;
use App\Enums\ProductType;
use Illuminate\Support\Facades\DB;


class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = DB::table('categories')->pluck('id', 'slug')->all();
        $suppliers = DB::table('suppliers')->pluck('id', 'name')->all();
        // Usamos un array para definir los datos, lo que hace el seeder más legible y mantenible.
        $productsData = [
            // --- BEBIDAS (Servicios) ---
            [
                'product' => ['name' => 'Café Espresso', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-ESP', 'selling_price' => 100.00]
            ],
            [
                'product' => ['name' => 'Café Americano', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-AMER', 'selling_price' => 110.00]
            ],
            [
                'product' => ['name' => 'Cappuccino', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-CAPP', 'selling_price' => 150.00]
            ],
            [
                'product' => ['name' => 'Latte', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-LATTE', 'selling_price' => 150.00]
            ],
            [
                'product' => ['name' => 'Café Helado (Iced Coffee)', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Vaso'],
                'variant' => ['sku' => 'SERV-ICE-C', 'selling_price' => 160.00]
            ],
            [
                'product' => ['name' => 'Chocolate Caliente', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-CHOCO', 'selling_price' => 140.00]
            ],
            [
                'product' => ['name' => 'Té Caliente (Variado)', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Taza'],
                'variant' => ['sku' => 'SERV-TEA', 'selling_price' => 90.00]
            ],
            [
                'product' => ['name' => 'Frappuccino', 'product_nature' => ProductNature::SERVICE, 'unit' => 'Vaso'],
                'variant' => ['sku' => 'SERV-FRAPP', 'selling_price' => 225.00]
            ],

            // --- PANADERÍA Y POSTRES (Inventariables) ---
            [
                'product' => ['name' => 'Croissant de Mantequilla', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'PAN-CRO-01', 'selling_price' => 85.00, 'cost_price' => 40.00]
            ],
            [
                'product' => ['name' => 'Croissant de Chocolate', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'PAN-CRO-02', 'selling_price' => 110.00, 'cost_price' => 55.00]
            ],
            [
                'product' => ['name' => 'Muffin de Blueberry', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'POS-MUF-01', 'selling_price' => 95.00, 'cost_price' => 45.00]
            ],
            [
                'product' => ['name' => 'Galleta con Chispas de Chocolate', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'POS-GAL-01', 'selling_price' => 60.00, 'cost_price' => 25.00]
            ],
            [
                'product' => ['name' => 'Bizcocho de Zanahoria (Rebanada)', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Rebanada'],
                'variant' => ['sku' => 'POS-BIZ-01', 'selling_price' => 180.00, 'cost_price' => 80.00]
            ],
            [
                'product' => ['name' => 'Empanada de Pollo', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'COM-EMP-01', 'selling_price' => 75.00, 'cost_price' => 35.00]
            ],
            [
                'product' => ['name' => 'Sándwich de Jamón y Queso', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'COM-SAND-01', 'selling_price' => 250.00, 'cost_price' => 120.00]
            ],

            // --- BEBIDAS EMBOTELLADAS (Inventariables) ---
            [
                'product' => ['name' => 'Agua Embotellada', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Botella'],
                'variant' => ['sku' => 'BEB-AGUA-01', 'selling_price' => 50.00, 'cost_price' => 20.00]
            ],
            [
                'product' => ['name' => 'Jugo de Naranja', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Botella'],
                'variant' => ['sku' => 'BEB-JUGO-01', 'selling_price' => 125.00, 'cost_price' => 60.00]
            ],
            [
                'product' => ['name' => 'Refresco (Lata)', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Lata'],
                'variant' => ['sku' => 'BEB-SODA-01', 'selling_price' => 75.00, 'cost_price' => 30.00]
            ],

            // --- OTROS (Inventariables) ---
            [
                'product' => ['name' => 'Café en Grano (Funda 1lb)', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Funda'],
                'variant' => ['sku' => 'MERCH-CAFE-01', 'selling_price' => 550.00, 'cost_price' => 275.00]
            ],
            [
                'product' => ['name' => 'Taza de Cerámica con Logo', 'product_nature' => ProductNature::STOCKABLE, 'unit' => 'Unidad'],
                'variant' => ['sku' => 'MERCH-TAZA-01', 'selling_price' => 450.00, 'cost_price' => 200.00]
            ],
        ];

        foreach ($productsData as $data) {
            $productData = $data['product'];
            $categorySlug = $productData['category'] ?? null;
            $supplierName = $productData['supplier'] ?? null;

            // Removemos las llaves temporales para que no entren en el `create`
            unset($productData['category'], $productData['supplier']);

            // 2. Asignamos las llaves foráneas
            if ($categorySlug && isset($categories[$categorySlug])) {
                $productData['category_id'] = $categories[$categorySlug];
            }
            if ($supplierName && isset($suppliers[$supplierName])) {
                $productData['supplier_id'] = $suppliers[$supplierName];
            }

            $product = Product::create(array_merge(
                ['type' => ProductType::SIMPLE],
                $productData
            ));

            $product->variants()->create($data['variant']);
        }
    }
}
