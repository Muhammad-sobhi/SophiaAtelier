<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::withCount('dresses')->get());
    }

    public function publicIndex()
    {
        $categories = Cache::remember('public_categories', 3600, function () {
            return Category::withCount('dresses')->get();
        });
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('categories', 'public');
            $validated['image_path'] = $path;
        }

        $category = Category::create($validated);
        Cache::forget('public_categories');

        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        $category->load('dresses');

        return response()->json($category);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('categories', 'public');
            $validated['image_path'] = $path;
        }

        $category->update($validated);
        Cache::forget('public_categories');

        return response()->json($category);
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();
        Cache::forget('public_categories');

        return response()->json(['message' => 'Category deleted']);
    }
}
