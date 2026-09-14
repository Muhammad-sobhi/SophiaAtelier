<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [ 'client_id' => \App\Models\Client::factory(), 'dress_id' => \App\Models\Dress::factory(), 'event_date' => fake()->date(), 'booking_date' => fake()->date(), 'total_amount' => 5000, 'status' => 'confirmed' ];
    }
}


