<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Dress;
use App\Services\DressAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    /**
     * Website: availability of the bride's chosen dresses (cart) or of the whole catalog (no dress_ids)
     * for her try-on date and wedding date. Never exposes other brides' details.
     */
    public function publicCheck(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dress_ids' => 'nullable|array|max:3',
            'dress_ids.*' => 'integer',
            'visit_date' => 'nullable|date|after_or_equal:today',
            'wedding_date' => 'nullable|date|after_or_equal:today',
            'city' => 'nullable|string|max:100',
            'client_id' => 'nullable|integer',
        ]);

        $dresses = Dress::with('images')
            ->where('is_website_visible', true)
            ->when(!empty($validated['dress_ids']), fn($q) => $q->whereIn('id', $validated['dress_ids']))
            ->get();

        $client = !empty($validated['client_id']) ? Client::find($validated['client_id']) : null;
        $city = $validated['city'] ?? $client?->city;

        $result = DressAvailabilityService::check(
            $dresses,
            $validated['visit_date'] ?? null,
            $validated['wedding_date'] ?? null,
            $city,
            $client?->id
        );

        // Cart checks of a known bride: remember dresses she wanted but could not get (lost demand report)
        if ($client && !empty($validated['dress_ids']) && !empty($validated['wedding_date'])) {
            DressAvailabilityService::recordDemandMisses($client->id, $validated['wedding_date'], $result['dresses']);
        }

        return response()->json(DressAvailabilityService::publicView($result));
    }

    /** Dashboard: same check with full details, e.g. while an employee registers a visit in the shop */
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dress_ids' => 'required|array|min:1|max:3',
            'dress_ids.*' => 'integer|exists:dresses,id',
            'visit_date' => 'nullable|date',
            'wedding_date' => 'nullable|date',
            'city' => 'nullable|string|max:100',
            'client_id' => 'nullable|integer|exists:clients,id',
        ]);

        $dresses = Dress::with('images')->whereIn('id', $validated['dress_ids'])->get();

        return response()->json(DressAvailabilityService::check(
            $dresses,
            $validated['visit_date'] ?? null,
            $validated['wedding_date'] ?? null,
            $validated['city'] ?? null,
            $validated['client_id'] ?? null
        ));
    }
}
