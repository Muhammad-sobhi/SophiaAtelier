<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Offer;
use Illuminate\Validation\ValidationException;

/**
 * Checks the offer staff applied to a booking. total_amount is the price after the discount,
 * so the discount must match the offer's rule on (total_amount + discount_amount).
 */
class BookingOfferService
{
    /** Rounding slack between the dashboard's and the server's discount math (EGP) */
    private const TOLERANCE = 1.0;

    /**
     * @param  array<int, int|string|null>  $dressIds
     * @return array{offer_id: int|null, discount_amount: float}
     */
    public function resolve(?int $offerId, float $discount, float $netTotal, array $dressIds, ?Booking $existing = null): array
    {
        if (! $offerId) {
            return ['offer_id' => null, 'discount_amount' => 0.0];
        }

        // Already checked when it was applied; it stays valid after the offer ends
        if ($existing && (int) $existing->offer_id === $offerId && abs((float) $existing->discount_amount - $discount) < 0.01) {
            return ['offer_id' => $offerId, 'discount_amount' => (float) $existing->discount_amount];
        }

        $offer = Offer::running()->find($offerId);
        if (! $offer) {
            throw ValidationException::withMessages(['offer_id' => 'العرض غير متاح حاليًا']);
        }

        $covered = $offer->coveredDressIds();
        $dressIds = array_map('intval', array_filter($dressIds));
        if ($covered !== null && ! array_intersect($dressIds, $covered)) {
            throw ValidationException::withMessages(['offer_id' => 'العرض لا يشمل الفساتين المختارة']);
        }

        if ($offer->type === 'perk') {
            return ['offer_id' => $offer->id, 'discount_amount' => 0.0];
        }

        $gross = $netTotal + $discount;
        $expected = $offer->type === 'percentage'
            ? round($gross * (float) $offer->value / 100, 2)
            : min((float) $offer->value, $gross);

        if (abs($expected - $discount) > self::TOLERANCE) {
            throw ValidationException::withMessages(['discount_amount' => 'قيمة الخصم لا تطابق العرض']);
        }

        return ['offer_id' => $offer->id, 'discount_amount' => round($discount, 2)];
    }
}
