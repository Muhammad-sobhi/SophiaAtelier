<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Revenue>
 */
class RevenueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [ 'booking_id' => \App\Models\Booking::factory(), 'type' => 'deposit', 'amount' => 1000, 'payment_method' => 'cash', 'payment_date' => fake()->date() ];
    }
}

