<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Dress>
 */
class DressFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [ 'code' => fake()->unique()->bothify('DR-####'), 'name' => fake()->word(), 'color' => 'White', 'rental_price' => 5000, 'status' => 'available', 'category_id' => \App\Models\Category::factory(), 'designer_id' => \App\Models\Designer::factory() ];
    }
}




