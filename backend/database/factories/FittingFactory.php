<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fitting>
 */
class FittingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [ 'booking_id' => \App\Models\Booking::factory(), 'fitting_date' => fake()->date(), 'status' => 'scheduled' ];
    }
}


