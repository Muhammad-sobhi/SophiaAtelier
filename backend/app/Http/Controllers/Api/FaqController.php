<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /**
     * Display a listing of all FAQs for Dashboard.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Faq::query();

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN));
        }

        $faqs = $query->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($faqs);
    }

    /**
     * Display active FAQs for public website.
     */
    public function publicIndex(): JsonResponse
    {
        $faqs = Faq::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($faqs);
    }

    /**
     * Store a newly created FAQ.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:500',
            'question_ar' => 'nullable|string|max:500',
            'answer' => 'required|string',
            'answer_ar' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = Faq::max('sort_order') + 1;
        }

        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $faq = Faq::create($validated);

        return response()->json($faq, 201);
    }

    /**
     * Display the specified FAQ.
     */
    public function show(Faq $faq): JsonResponse
    {
        return response()->json($faq);
    }

    /**
     * Update the specified FAQ.
     */
    public function update(Request $request, Faq $faq): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'sometimes|required|string|max:500',
            'question_ar' => 'nullable|string|max:500',
            'answer' => 'sometimes|required|string',
            'answer_ar' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $faq->update($validated);

        return response()->json($faq);
    }

    /**
     * Remove the specified FAQ.
     */
    public function destroy(Faq $faq): JsonResponse
    {
        $faq->delete();

        return response()->json(['message' => 'FAQ deleted successfully']);
    }
}
