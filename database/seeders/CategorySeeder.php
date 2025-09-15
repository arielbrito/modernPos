<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run(): void
    {
        // Deshabilitar la revisión de llaves foráneas de forma compatible con la base de datos.
        Schema::disableForeignKeyConstraints();
        DB::table('categories')->truncate();
        Schema::enableForeignKeyConstraints();

        // Define la estructura de categorías y subcategorías para un POS general
        $categories = [
            [
                'name' => 'Bebidas',
                'description' => 'Bebidas frías, calientes y alcohólicas.',
                'children' => [
                    [
                        'name' => 'Cafés e Infusiones',
                        'description' => 'Variedad de cafés, tés y otras infusiones calientes.',
                        'children' => [
                            ['name' => 'Café Americano', 'description' => 'Café negro clásico.'],
                            ['name' => 'Cappuccino', 'description' => 'Café con leche y espuma.'],
                            ['name' => 'Té', 'description' => 'Diferentes sabores de té.'],
                        ]
                    ],
                    [
                        'name' => 'Bebidas Frías',
                        'description' => 'Refrescos, jugos y otras bebidas refrescantes.',
                        'children' => [
                            ['name' => 'Refrescos (Gaseosas)', 'description' => 'Bebidas carbonatadas de varias marcas.'],
                            ['name' => 'Jugos Naturales', 'description' => 'Jugos hechos con frutas frescas.'],
                            ['name' => 'Agua Embotellada', 'description' => 'Agua purificada en botella.'],
                            ['name' => 'Batidos', 'description' => 'Batidos de frutas naturales.'],
                        ]
                    ],
                    [
                        'name' => 'Bebidas Alcohólicas',
                        'description' => 'Cervezas, vinos y licores.',
                        'children' => [
                            ['name' => 'Cervezas', 'description' => 'Cervezas nacionales e importadas.'],
                            ['name' => 'Rones', 'description' => 'Selección de rones locales.'],
                        ]
                    ],
                ]
            ],
            [
                'name' => 'Alimentos Preparados',
                'description' => 'Comidas listas para consumir, desde desayunos hasta postres.',
                'children' => [
                    [
                        'name' => 'Panadería y Repostería',
                        'description' => 'Productos horneados frescos del día.',
                        'children' => [
                            ['name' => 'Panes', 'description' => 'Variedad de panes frescos.'],
                            ['name' => 'Pasteles y Postres', 'description' => 'Porciones de pasteles, flanes y otros dulces.'],
                        ]
                    ],
                    [
                        'name' => 'Sándwiches y Bocadillos',
                        'description' => 'Opciones rápidas y deliciosas para cualquier momento.',
                        'children' => [
                            ['name' => 'Sándwiches', 'description' => 'Sándwiches fríos y calientes.'],
                            ['name' => 'Empanadas', 'description' => 'Empanadas de diferentes rellenos.'],
                        ]
                    ],
                ]
            ],
            [
                'name' => 'Abarrotes',
                'description' => 'Productos básicos de despensa y colmado.',
                'children' => [
                    [
                        'name' => 'Enlatados y Conservas',
                        'description' => 'Productos enlatados para una larga duración.',
                        'children' => [
                            ['name' => 'Atún y Sardinas', 'description' => 'Pescados enlatados.'],
                            ['name' => 'Habichuelas y Guandules', 'description' => 'Legumbres enlatadas.'],
                        ]
                    ],
                    [
                        'name' => 'Granos y Pastas',
                        'description' => 'Alimentos secos como arroz, pastas y granos.',
                        'children' => [
                            ['name' => 'Arroz', 'description' => 'Diferentes tipos de arroz.'],
                            ['name' => 'Pastas', 'description' => 'Espaguetis, coditos, etc.'],
                        ]
                    ],
                    ['name' => 'Aceites y Condimentos', 'description' => 'Aceites, sal, azúcar, sazones y especias.'],
                ]
            ],
            [
                'name' => 'Lácteos y Refrigerados',
                'description' => 'Productos que requieren refrigeración.',
                'children' => [
                    ['name' => 'Leches', 'description' => 'Leche entera, descremada, evaporada.'],
                    ['name' => 'Quesos', 'description' => 'Variedad de quesos frescos y madurados.'],
                    ['name' => 'Yogures', 'description' => 'Yogures de diferentes sabores y tipos.'],
                    ['name' => 'Embutidos', 'description' => 'Jamón, salami, salchichas.'],
                ]
            ],
            [
                'name' => 'Snacks y Dulces',
                'description' => 'Productos para picar entre comidas.',
                'children' => [
                    ['name' => 'Papas Fritas y Platanitos', 'description' => 'Snacks salados empacados.'],
                    ['name' => 'Galletas', 'description' => 'Galletas dulces y saladas.'],
                    ['name' => 'Chocolates y Golosinas', 'description' => 'Dulces, mentas y chocolates.'],
                ]
            ],
            [
                'name' => 'Cuidado Personal y Limpieza',
                'description' => 'Productos de higiene y para la limpieza del hogar.',
                'children' => [
                    ['name' => 'Higiene Personal', 'description' => 'Jabones, shampoo, pasta dental.'],
                    ['name' => 'Limpieza del Hogar', 'description' => 'Detergentes, cloro, desinfectantes.'],
                ]
            ],
        ];

        // Función recursiva para insertar categorías y sus hijos
        $this->createCategories($categories);
    }

    /**
     * Crea las categorías de forma recursiva.
     *
     * @param array $categories
     * @param int|null $parentId
     */
    private function createCategories(array $categories, ?int $parentId = null): void
    {
        foreach ($categories as $category) {
            $categoryId = DB::table('categories')->insertGetId([
                'name' => $category['name'],
                'slug' => Str::slug($category['name']),
                'description' => $category['description'] ?? null,
                'parent_id' => $parentId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (isset($category['children'])) {
                $this->createCategories($category['children'], $categoryId);
            }
        }
    }
}
