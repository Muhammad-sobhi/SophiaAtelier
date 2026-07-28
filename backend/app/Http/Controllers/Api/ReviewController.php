<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Display a listing of all reviews (Dashboard).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Review::query();

        if ($request->has('status') && in_array($request->query('status'), ['published', 'draft'])) {
            $query->where('status', $request->query('status'));
        }

        $reviews = $query->orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reviews);
    }

    /**
     * Display published reviews for public website.
     */
    public function publicIndex(): JsonResponse
    {
        $reviews = Review::where('status', 'published')
            ->orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reviews);
    }

    /**
     * Store a newly created review in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'review_text' => 'nullable|string',
            'status' => 'required|in:published,draft',
            'sort_order' => 'nullable|integer',
        ]);

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = 0;
        }

        $review = Review::create($validated);

        return response()->json($review, 201);
    }

    /**
     * Display the specified review.
     */
    public function show(Review $review): JsonResponse
    {
        return response()->json($review);
    }

    /**
     * Update the specified review in storage.
     */
    public function update(Request $request, Review $review): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'sometimes|required|string|max:255',
            'rating' => 'sometimes|required|integer|min:1|max:5',
            'review_text' => 'nullable|string',
            'status' => 'sometimes|required|in:published,draft',
            'sort_order' => 'nullable|integer',
        ]);

        $review->update($validated);

        return response()->json($review);
    }

    /**
     * Remove the specified review from storage.
     */
    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }
}
