<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Facades\Cache;

class CollectionController extends Controller
{
    public function index()
    {
        return response()->json(Collection::withCount('dresses')->get());
    }

    public function publicIndex()
    {
        $collections = Cache::remember('public_collections', 3600, function () {
            return Collection::withCount('dresses')->get();
        });
        return response()->json($collections);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'tagline_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('collections', 'public');
        }

        $collection = Collection::create($validated);
        Cache::forget('public_collections');

        return response()->json($collection, 201);
    }

    public function show(Collection $collection)
    {
        $collection->load(['dresses.category', 'dresses.images']);
        return response()->json($collection);
    }

    public function update(Request $request, Collection $collection): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'tagline_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            if ($collection->image) {
                Storage::disk('public')->delete($collection->image);
            }
            $validated['image'] = $request->file('image')->store('collections', 'public');
        }

        $collection->update($validated);
        Cache::forget('public_collections');

        return response()->json($collection);
    }

    public function destroy(Collection $collection): JsonResponse
    {
        if ($collection->image) {
            Storage::disk('public')->delete($collection->image);
        }
        $collection->delete();
        Cache::forget('public_collections');

        return response()->json(['message' => 'Collection deleted']);
    }
}
